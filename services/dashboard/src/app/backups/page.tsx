"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Database, 
  HardDrive, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Download, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  AlertCircle,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Activity,
  Mail,
  TrendingUp,
  Bell,
  BellOff,
  Search,
  X,
  Filter,
  Eye,
  Copy,
  FileCode,
  Tag,
  Hash
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface Snapshot {
  id: number;
  filename: string;
  size_bytes: number;
  frequency: string;
  status: string;
  retention_days: number;
  created_at: string;
  tags?: string[];
  storage_tier: 'standard' | 'archive';
}

interface BackupSettings {
  frequency: string;
  retention_days: number;
  auto_backup_enabled: boolean;
  admin_notifications_enabled: boolean;
  storage_threshold_gb: number;
  storage_alerts_email_enabled: boolean;
  storage_alerts_system_enabled: boolean;
  storage_trend_enabled: boolean;
  admin_contact_email: string;
  off_peak_enabled: boolean;
  off_peak_start: string;
  off_peak_end: string;
  cron_expression: string;
  last_backup_at: string | null;
  threshold_warning_percent: number;
  threshold_critical_percent: number;
  threshold_fatal_percent: number;
}

interface BackupSummary {
  success_rate: number;
  total_storage_bytes: number;
  total_snapshots: number;
  next_scheduled_backup_at: string;
  frequency: string;
}

interface BucketPolicy {
  id?: number;
  bucket_type: string;
  retention_days: number;
  archive_after_days: number;
  auto_prune_enabled: boolean;
  max_count?: number;
  max_size_gb?: number;
}

interface AlertLog {
  id: number;
  severity: string;
  threshold_percent: number;
  current_percent: number;
  notified_email: boolean;
  notified_system: boolean;
  created_at: string;
}

interface StorageAnalyticsPoint {
  raw_date: string;
  date: string;
  storage_bytes: number;
  storage_mb: number;
  snapshot_count: number;
}

export default function BackupsPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<BackupSettings>({
    frequency: "daily",
    retention_days: 7,
    auto_backup_enabled: true,
    admin_notifications_enabled: true,
    storage_threshold_gb: 10,
    storage_alerts_email_enabled: true,
    storage_alerts_system_enabled: true,
    storage_trend_enabled: false,
    admin_contact_email: "",
    off_peak_enabled: false,
    off_peak_start: "00:00",
    off_peak_end: "06:00",
    cron_expression: "0 0 * * *",
    last_backup_at: null,
    threshold_warning_percent: 50,
    threshold_critical_percent: 75,
    threshold_fatal_percent: 90,
  });

  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [storageAnalytics, setStorageAnalytics] = useState<StorageAnalyticsPoint[]>([]);
  const [bucketPolicies, setBucketPolicies] = useState<BucketPolicy[]>([
    { bucket_type: "daily", retention_days: 7, archive_after_days: 3, auto_prune_enabled: true },
    { bucket_type: "weekly", retention_days: 30, archive_after_days: 14, auto_prune_enabled: true },
    { bucket_type: "monthly", retention_days: 365, archive_after_days: 90, auto_prune_enabled: true },
  ]);
  const [savingBucketPolicies, setSavingBucketPolicies] = useState(false);
  const [bucketPoliciesSaved, setBucketPoliciesSaved] = useState(false);
  const [pruning, setPruning] = useState(false);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [alertLogs, setAlertLogs] = useState<AlertLog[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // User safety limits for health notification toasts
  const [dbLatencyLimit, setDbLatencyLimit] = useState(100);
  const [redisMemLimit, setRedisMemLimit] = useState(80);
  const [limitsSaved, setLimitsSaved] = useState(false);

  // Multi-select & Bulk Delete state
  const [selectedSnapshotIds, setSelectedSnapshotIds] = useState<number[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Snapshot Preview state
  const [previewSnapshot, setPreviewSnapshot] = useState<Snapshot | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Delete animation state
  const [animatingDeleteIds, setAnimatingDeleteIds] = useState<number[]>([]);

  // Custom Tags management state
  const [snapshotTags, setSnapshotTags] = useState<Record<number, string[]>>({});
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("");
  const [editingTagsSnapshot, setEditingTagsSnapshot] = useState<Snapshot | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>("");

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Storage Optimization & Global Retention state
  const [isRetentionModalOpen, setIsGlobalRetentionModalOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [dailyBackupTime, setDailyBackupTime] = useState("00:00");

  const parseTimeFromCron = (cron: string): string => {
    const parts = cron.split(" ");
    if (parts.length >= 2) {
      const min = parts[0].padStart(2, "0");
      const hour = parts[1].padStart(2, "0");
      return `${hour}:${min}`;
    }
    return "00:00";
  };

  const getDefaultTagsForSnapshot = (snap: Snapshot): string[] => {
    if (snap.frequency === "manual") return ["manual-run", "pre-deploy"];
    if (snap.frequency === "weekly") return ["automated", "weekly-retention"];
    if (snap.frequency === "monthly") return ["compliance", "audit-archival"];
    return ["automated", "daily-backup"];
  };

  const getTagsForSnapshot = (snap: Snapshot): string[] => {
    return snapshotTags[snap.id] || snap.tags || getDefaultTagsForSnapshot(snap);
  };

  const filteredSnapshots = snapshots.filter((snap) => {
    const query = searchQuery.trim().toLowerCase();
    const tags = getTagsForSnapshot(snap);

    const matchesStatus = statusFilter === "all" || snap.status === statusFilter;

    const matchesSearch =
      query === "" ||
      snap.filename.toLowerCase().includes(query) ||
      snap.frequency.toLowerCase().includes(query) ||
      snap.status.toLowerCase().includes(query) ||
      tags.some((t) => t.toLowerCase().includes(query));

    let matchesTagFilter = true;
    if (selectedTagFilter) {
      matchesTagFilter = tags.includes(selectedTagFilter);
    }

    let matchesDateRange = true;
    if (startDate) {
      const snapDate = new Date(snap.created_at);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchesDateRange = matchesDateRange && snapDate >= start;
    }
    if (endDate) {
      const snapDate = new Date(snap.created_at);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchesDateRange = matchesDateRange && snapDate <= end;
    }

    return matchesStatus && matchesSearch && matchesTagFilter && matchesDateRange;
  });

  useEffect(() => {
    setMounted(true);
    fetchSettingsAndSnapshots();
    fetchAlertLogs();
    const storedDbLat = localStorage.getItem("safety_limit_db_latency");
    const storedRedisMem = localStorage.getItem("safety_limit_redis_memory");
    if (storedDbLat) setDbLatencyLimit(parseInt(storedDbLat));
    if (storedRedisMem) setRedisMemLimit(parseInt(storedRedisMem));
  }, []);

  const fetchSettingsAndSnapshots = async () => {
    setLoading(true);
    try {
      const [settingsRes, snapshotsRes, summaryRes, bucketPoliciesRes, analyticsRes] = await Promise.all([
        fetch("/api/control-plane/backups/settings"),
        fetch("/api/control-plane/backups/snapshots"),
        fetch("/api/control-plane/backups/summary"),
        fetch("/api/control-plane/backups/bucket-policies"),
        fetch("/api/control-plane/backups/storage-analytics")
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          frequency: data.frequency || "daily",
          retention_days: data.retention_days || 7,
          auto_backup_enabled: data.auto_backup_enabled !== undefined ? data.auto_backup_enabled : true,
          admin_notifications_enabled: data.admin_notifications_enabled !== undefined ? data.admin_notifications_enabled : true,
          storage_threshold_gb: data.storage_threshold_gb || 10,
          storage_alerts_email_enabled: data.storage_alerts_email_enabled !== undefined ? data.storage_alerts_email_enabled : true,
          storage_alerts_system_enabled: data.storage_alerts_system_enabled !== undefined ? data.storage_alerts_system_enabled : true,
          storage_trend_enabled: data.storage_trend_enabled !== undefined ? data.storage_trend_enabled : false,
          admin_contact_email: data.admin_contact_email || "",
          off_peak_enabled: data.off_peak_enabled !== undefined ? data.off_peak_enabled : false,
          off_peak_start: data.off_peak_start || "00:00",
          off_peak_end: data.off_peak_end || "06:00",
          cron_expression: data.cron_expression || "0 0 * * *",
          last_backup_at: data.last_backup_at || null,
          threshold_warning_percent: data.threshold_warning_percent || 50,
          threshold_critical_percent: data.threshold_critical_percent || 75,
          threshold_fatal_percent: data.threshold_fatal_percent || 90,
        });
        if (data.cron_expression) {
          setDailyBackupTime(parseTimeFromCron(data.cron_expression));
        }
      }

      if (snapshotsRes.ok) {
        const list = await snapshotsRes.json();
        setSnapshots(list);
        
        // Build tags map from database snapshots
        const tagsMap: Record<number, string[]> = {};
        list.forEach((s: Snapshot) => {
          if (s.tags && s.tags.length > 0) {
            tagsMap[s.id] = s.tags;
          }
        });
        setSnapshotTags(tagsMap);
      }

      if (summaryRes.ok) {
        const sumData = await summaryRes.json();
        setSummary(sumData);
      }

      if (bucketPoliciesRes.ok) {
        const polData = await bucketPoliciesRes.json();
        if (Array.isArray(polData) && polData.length > 0) {
          setBucketPolicies(polData);
        }
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (Array.isArray(analyticsData)) {
          setStorageAnalytics(analyticsData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch backup details:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlertLogs = async () => {
    try {
      const res = await fetch("/api/control-plane/backups/alerts-log");
      if (res.ok) {
        setAlertLogs(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch alert logs:", err);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/control-plane/backups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency: settings.frequency,
          retentionDays: settings.retention_days,
          autoBackupEnabled: settings.auto_backup_enabled,
          adminNotificationsEnabled: settings.admin_notifications_enabled,
          storageThresholdGb: settings.storage_threshold_gb,
          storageAlertsEmailEnabled: settings.storage_alerts_email_enabled,
          storageAlertsSystemEnabled: settings.storage_alerts_system_enabled,
          storageTrendEnabled: settings.storage_trend_enabled,
          adminContactEmail: settings.admin_contact_email,
          offPeakEnabled: settings.off_peak_enabled,
          offPeakStart: settings.off_peak_start,
          offPeakEnd: settings.off_peak_end,
          cronExpression: settings.cron_expression,
          thresholdWarningPercent: settings.threshold_warning_percent,
          thresholdCriticalPercent: settings.threshold_critical_percent,
          thresholdFatalPercent: settings.threshold_fatal_percent,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert("Failed to save backup settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePruneSnapshots = async () => {
    setPruning(true);
    try {
      const res = await fetch("/api/control-plane/backups/prune", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Pruned ${data.prunedCount} snapshot(s) according to retention policy rules.`);
        await fetchSettingsAndSnapshots();
      }
    } catch (err) {
      alert("Failed to prune snapshots");
    } finally {
      setPruning(false);
    }
  };

  const handleSaveBucketPolicies = async () => {
    setSavingBucketPolicies(true);
    try {
      const res = await fetch("/api/control-plane/backups/bucket-policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies: bucketPolicies }),
      });

      if (res.ok) {
        setBucketPoliciesSaved(true);
        setTimeout(() => setBucketPoliciesSaved(false), 3000);
      }
    } catch (err) {
      alert("Failed to save bucket policies");
    } finally {
      setSavingBucketPolicies(false);
    }
  };

  const handleSaveHealthLimits = async () => {
    localStorage.setItem("safety_limit_db_latency", dbLatencyLimit.toString());
    localStorage.setItem("safety_limit_redis_memory", redisMemLimit.toString());
    try {
      await fetch("/api/control-plane/backups/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frequency: settings.frequency,
          retentionDays: settings.retention_days,
          autoBackupEnabled: settings.auto_backup_enabled,
          adminNotificationsEnabled: settings.admin_notifications_enabled,
          dbLatencyLimitMs: dbLatencyLimit,
          redisMemoryLimitPercent: redisMemLimit,
        }),
      });
      setLimitsSaved(true);
      setTimeout(() => setLimitsSaved(false), 3000);
    } catch (err) {
      console.error("Failed to persist safety limits:", err);
    }
  };

  const handleCreateSnapshot = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/control-plane/backups/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: "manual" }),
      });

      if (res.ok) {
        await fetchSettingsAndSnapshots();
      }
    } catch (err) {
      alert("Failed to create backup snapshot");
    } finally {
      setCreating(false);
    }
  };

  const handleSimulateFailure = async () => {
    try {
      const res = await fetch("/api/control-plane/backups/snapshots/simulate-failure", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.emailSent) {
          alert("Simulated backup failure! Critical email alert notification sent to administrator contact email.");
        } else {
          alert("Simulated backup failure! (Note: Admin email alerts are currently toggled OFF in settings)");
        }
        await fetchSettingsAndSnapshots();
      }
    } catch (err) {
      alert("Failed to simulate backup failure");
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    if (!confirm("Are you sure you want to delete this snapshot?")) return;
    
    // Add ID to animating delete list to trigger smooth CSS slide-out & fade-out
    setAnimatingDeleteIds((prev) => [...prev, id]);

    setTimeout(async () => {
      try {
        const res = await fetch(`/api/control-plane/backups/snapshots/${id}`, {
          method: "DELETE",
        });

        if (res.ok) {
          setSnapshots((prev) => prev.filter((s) => s.id !== id));
          setSelectedSnapshotIds((prev) => prev.filter((item) => item !== id));
        }
      } catch (err) {
        alert("Failed to delete snapshot");
      } finally {
        setAnimatingDeleteIds((prev) => prev.filter((itemId) => itemId !== id));
      }
    }, 450);
  };

  const handleBulkDelete = async () => {
    if (selectedSnapshotIds.length === 0) return;
    setIsBulkDeleting(true);

    // Trigger smooth CSS slide-out & fade-out for all selected snapshot IDs
    setAnimatingDeleteIds((prev) => Array.from(new Set([...prev, ...selectedSnapshotIds])));

    setTimeout(async () => {
      try {
        await Promise.all(
          selectedSnapshotIds.map((id) =>
            fetch(`/api/control-plane/backups/snapshots/${id}`, { method: "DELETE" })
          )
        );
        setSnapshots((prev) => prev.filter((s) => !selectedSnapshotIds.includes(s.id)));
        setSelectedSnapshotIds([]);
        setIsBulkDeleteModalOpen(false);
        await fetchSettingsAndSnapshots();
      } catch (err) {
        alert("Failed to delete selected snapshots");
      } finally {
        setIsBulkDeleting(false);
        setAnimatingDeleteIds([]);
      }
    }, 450);
  };

  const handleAddTagToSnapshot = async (snapshotId: number, tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleaned) return;
    const targetSnap = snapshots.find((s) => s.id === snapshotId);
    if (!targetSnap) return;

    const currentTags = getTagsForSnapshot(targetSnap);
    if (currentTags.includes(cleaned)) return;
    
    const updatedTags = [...currentTags, cleaned];

    try {
      const res = await fetch(`/api/control-plane/backups/snapshots/${snapshotId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        setSnapshots(prev => prev.map(s => s.id === snapshotId ? { ...s, tags: updatedTags } : s));
        setSnapshotTags(prev => ({ ...prev, [snapshotId]: updatedTags }));
      }
    } catch (err) {
      console.error("Failed to save tag:", err);
    }
    setNewTagInput("");
  };

  const handleRemoveTagFromSnapshot = async (snapshotId: number, tagToRemove: string) => {
    const targetSnap = snapshots.find((s) => s.id === snapshotId);
    if (!targetSnap) return;

    const currentTags = getTagsForSnapshot(targetSnap);
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);

    try {
      const res = await fetch(`/api/control-plane/backups/snapshots/${snapshotId}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: updatedTags }),
      });

      if (res.ok) {
        setSnapshots(prev => prev.map(s => s.id === snapshotId ? { ...s, tags: updatedTags } : s));
        setSnapshotTags(prev => ({ ...prev, [snapshotId]: updatedTags }));
      }
    } catch (err) {
      console.error("Failed to remove tag:", err);
    }
  };

  const isAllFilteredSelected =
    filteredSnapshots.length > 0 &&
    filteredSnapshots.every((s) => selectedSnapshotIds.includes(s.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedSnapshotIds((prev) =>
        prev.filter((id) => !filteredSnapshots.some((s) => s.id === id))
      );
    } else {
      const filteredIds = filteredSnapshots.map((s) => s.id);
      setSelectedSnapshotIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleSelectSnapshot = (id: number) => {
    setSelectedSnapshotIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const generateSnapshotPreviewContent = (snapshot: Snapshot): string[] => {
    const createdDate = new Date(snapshot.created_at).toISOString();
    const formattedMb = (snapshot.size_bytes / (1024 * 1024)).toFixed(2);
    
    const lines: string[] = [
      `-- =========================================================`,
      `-- PostgreSQL Database Backup Dump Preview`,
      `-- Snapshot Filename : ${snapshot.filename}`,
      `-- Created Timestamp : ${createdDate}`,
      `-- Frequency Tier   : ${snapshot.frequency.toUpperCase()}`,
      `-- Compression      : GZIP / Plain Text SQL Dump`,
      `-- Target Engine     : PostgreSQL 15.3 (Ubuntu 15.3-1)`,
      `-- Estimated Size    : ${formattedMb} MB (${snapshot.size_bytes} Bytes)`,
      `-- Status           : ${snapshot.status.toUpperCase()}`,
      `-- =========================================================`,
      ``,
      `SET statement_timeout = 0;`,
      `SET lock_timeout = 0;`,
      `SET idle_in_transaction_session_timeout = 0;`,
      `SET client_encoding = 'UTF8';`,
      `SET standard_conforming_strings = on;`,
      `SELECT pg_catalog.set_config('search_path', '', false);`,
      `SET check_function_bodies = false;`,
      `SET xmloption = content;`,
      `SET client_min_messages = warning;`,
      `SET row_security = off;`,
      ``,
      `-- Schema Initialization for core tables`,
      `CREATE TABLE IF NOT EXISTS public.users (`,
      `    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,`,
      `    email character varying(255) NOT NULL UNIQUE,`,
      `    role character varying(50) DEFAULT 'member'::character varying,`,
      `    is_active boolean DEFAULT true,`,
      `    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,`,
      `    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP`,
      `);`,
      ``,
      `-- Table Data Dump: public.users`,
      `COPY public.users (id, email, role, is_active, created_at) FROM stdin;`,
      `1\tadmin@system.local\tadmin\ttrue\t2026-01-01 00:00:00+00`,
      `2\toperator@system.local\toperator\ttrue\t2026-01-02 12:30:00+00`,
      `3\tauditor@system.local\tauditor\ttrue\t2026-01-05 08:15:00+00`,
      `\\.`,
      ``,
      `-- Table Structure for table "backup_snapshots"`,
      `CREATE TABLE IF NOT EXISTS public.backup_snapshots (`,
      `    id integer NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,`,
      `    filename character varying(255) NOT NULL,`,
      `    checksum_sha256 character varying(64) NOT NULL,`,
      `    size_bytes bigint NOT NULL,`,
      `    status character varying(20) DEFAULT 'completed'::character varying,`,
      `    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP`,
      `);`,
      ``,
      `-- Primary Key Indexes & Constraints`,
      `CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON public.backup_snapshots USING btree (created_at);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);`,
      `ALTER TABLE ONLY public.backup_snapshots ADD CONSTRAINT fk_snapshot_creator FOREIGN KEY (id) REFERENCES public.users(id);`,
      ``,
      `-- End of First 50 Lines Preview for ${snapshot.filename}`,
      `-- Full database dump complete`
    ];
    return lines.slice(0, 50);
  };

  const renderCodeLine = (line: string) => {
    if (line.startsWith("--")) {
      return <span className="text-neutral-500 italic">{line}</span>;
    }
    if (line.startsWith("CREATE") || line.startsWith("ALTER") || line.startsWith("SELECT") || line.startsWith("COPY") || line.startsWith("SET")) {
      return <span className="text-emerald-400 font-semibold">{line}</span>;
    }
    if (line.includes("PRIMARY KEY") || line.includes("NOT NULL") || line.includes("DEFAULT")) {
      return <span className="text-indigo-300">{line}</span>;
    }
    return <span className="text-neutral-200">{line}</span>;
  };

  const handleCopyPreview = (snapshot: Snapshot) => {
    const lines = generateSnapshotPreviewContent(snapshot);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const calculateOptimization = () => {
    let duplicateBytes = 0;
    let outdatedBytes = 0;
    let duplicateIds: number[] = [];
    let outdatedIds: number[] = [];

    // Simple duplicate detection: same frequency and same size (within 100 bytes) created within same hour
    const seen = new Map<string, Snapshot>();
    
    snapshots.forEach(snap => {
      const dateKey = new Date(snap.created_at).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      const sizeKey = Math.floor(snap.size_bytes / 100);
      const key = `${snap.frequency}-${sizeKey}-${dateKey}`;
      
      if (seen.has(key)) {
        duplicateBytes += snap.size_bytes;
        duplicateIds.push(snap.id);
      } else {
        seen.set(key, snap);
      }

      // Detect outdated snapshots (not yet pruned but older than rule)
      const policy = bucketPolicies.find(p => p.bucket_type === snap.frequency) || { retention_days: settings.retention_days };
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - policy.retention_days);
      if (new Date(snap.created_at) < limitDate) {
        outdatedBytes += snap.size_bytes;
        outdatedIds.push(snap.id);
      }
    });

    return {
      duplicateBytes,
      outdatedBytes,
      totalOptimizable: duplicateBytes + outdatedBytes,
      ids: Array.from(new Set([...duplicateIds, ...outdatedIds]))
    };
  };

  const optimizationData = calculateOptimization();

  const handleRunOptimization = async () => {
    if (optimizationData.ids.length === 0) {
      alert("No optimization candidates found.");
      return;
    }
    
    setOptimizing(true);
    try {
      const res = await fetch("/api/control-plane/backups/prune", {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Optimization complete! Pruned ${data.prunedCount} snapshot(s) and freed up storage.`);
        await fetchSettingsAndSnapshots();
      }
    } catch (err) {
      alert("Failed to run optimization.");
    } finally {
      setOptimizing(false);
    }
  };

  const handleExportJSON = () => {
    const dataToExport = filteredSnapshots.map(snap => ({
      id: snap.id,
      filename: snap.filename,
      size_bytes: snap.size_bytes,
      frequency: snap.frequency,
      status: snap.status,
      created_at: snap.created_at,
      tags: getTagsForSnapshot(snap)
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_snapshots_audit_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportLogs = () => {
    const headers = ["ID", "Filename", "Status", "Size", "Duration (ms)", "Created At"];
    const rows = snapshots.map(s => [
      s.id,
      s.filename,
      s.status,
      s.size_bytes,
      (s as any).duration_ms || 0,
      s.created_at
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup_logs_audit_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // D3 Line Chart implementation
  const d3Container = React.useRef<SVGSVGElement>(null);
  const d3PieContainer = React.useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (mounted && d3PieContainer.current && summary) {
      const d3 = require("d3");
      const container = d3.select(d3PieContainer.current);
      
      const renderPie = () => {
        container.selectAll("*").remove();

        const width = d3PieContainer.current?.parentElement?.clientWidth || 200;
        const height = 200;
        const radius = Math.min(width, height) / 2;

        const svg = container
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${width / 2},${height / 2})`);

        const totalCapacityBytes = settings.storage_threshold_gb * 1024 * 1024 * 1024;
        const usedBytes = summary.total_storage_bytes;
        const availableBytes = Math.max(0, totalCapacityBytes - usedBytes);

        const data = [
          { label: "Used", value: usedBytes, color: "#10b981" },
          { label: "Available", value: availableBytes, color: "#1f2937" }
        ];

        const pie = d3.pie().value((d: any) => d.value).sort(null);
        const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);

        const paths = svg.selectAll("path")
          .data(pie(data))
          .enter()
          .append("path")
          .attr("d", arc)
          .attr("fill", (d: any) => d.data.color)
          .attr("stroke", "#0a0a0a")
          .style("stroke-width", "4px");

        // Add text in the middle
        const usedGb = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
        const totalGb = settings.storage_threshold_gb.toFixed(1);
        
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "-0.2em")
          .attr("fill", "white")
          .style("font-size", "20px")
          .style("font-weight", "800")
          .text(`${usedGb} GB`);

        svg.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "1.5em")
          .attr("fill", "#737373")
          .style("font-size", "10px")
          .style("font-weight", "bold")
          .style("text-transform", "uppercase")
          .text(`of ${totalGb} GB Used`);
      };

      renderPie();
      window.addEventListener("resize", renderPie);
      return () => window.removeEventListener("resize", renderPie);
    }
  }, [mounted, summary, settings.storage_threshold_gb]);

  useEffect(() => {
    if (mounted && d3Container.current && storageAnalytics.length > 0) {
      const d3 = require("d3");
      const container = d3.select(d3Container.current);
      
      const renderChart = () => {
        container.selectAll("*").remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 60 };
        const width = d3Container.current?.parentElement?.clientWidth || 800;
        const height = 280;
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const svg = container
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime()
          .domain(d3.extent(storageAnalytics, (d: any) => new Date(d.raw_date)))
          .range([0, chartWidth]);

        const y = d3.scaleLinear()
          .domain([0, Math.max(10, d3.max(storageAnalytics, (d: any) => d.storage_mb) * 1.2)])
          .range([chartHeight, 0]);

        // Grid lines
        svg.append("g")
          .attr("class", "grid")
          .attr("opacity", 0.05)
          .call(d3.axisLeft(y).tickSize(-chartWidth).tickFormat(() => ""));

        svg.append("g")
          .attr("transform", `translate(0,${chartHeight})`)
          .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %d")))
          .attr("color", "#525252")
          .selectAll("text")
          .style("fill", "#737373")
          .style("font-size", "10px")
          .attr("dy", "1.5em");

        svg.append("g")
          .call(d3.axisLeft(y).ticks(5).tickFormat((d: any) => `${d} MB`))
          .attr("color", "#525252")
          .selectAll("text")
          .style("fill", "#737373")
          .style("font-size", "10px");

        // Gradient for area
        const gradient = container.append("defs")
          .append("linearGradient")
          .attr("id", "storage-gradient")
          .attr("x1", "0%")
          .attr("y1", "0%")
          .attr("x2", "0%")
          .attr("y2", "100%");

        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "#10b981")
          .attr("stop-opacity", 0.6);

        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "#10b981")
          .attr("stop-opacity", 0.05);

        // Area
        const area = d3.area()
          .x((d: any) => x(new Date(d.raw_date)))
          .y0(chartHeight)
          .y1((d: any) => y(d.storage_mb))
          .curve(d3.curveMonotoneX);

        svg.append("path")
          .datum(storageAnalytics)
          .attr("fill", "url(#storage-gradient)")
          .attr("d", area);

        // Line
        svg.append("path")
          .datum(storageAnalytics)
          .attr("fill", "none")
          .attr("stroke", "#10b981")
          .attr("stroke-width", 3)
          .attr("d", d3.line()
            .x((d: any) => x(new Date(d.raw_date)))
            .y((d: any) => y(d.storage_mb))
            .curve(d3.curveMonotoneX)
          );

        // Interaction
        const focus = svg.append("g")
          .style("display", "none");

        focus.append("line")
          .attr("class", "x-hover-line")
          .attr("stroke", "white")
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "3,3")
          .attr("y1", 0)
          .attr("y2", chartHeight);

        focus.append("circle")
          .attr("r", 5)
          .attr("fill", "#10b981")
          .attr("stroke", "white")
          .attr("stroke-width", 2);

        const overlay = svg.append("rect")
          .attr("width", chartWidth)
          .attr("height", chartHeight)
          .attr("fill", "transparent")
          .on("mouseover", () => focus.style("display", null))
          .on("mouseout", () => focus.style("display", "none"))
          .on("mousemove", (event: any) => {
            const bisectDate = d3.bisector((d: any) => new Date(d.raw_date)).left;
            const x0 = x.invert(d3.pointer(event)[0]);
            const i = bisectDate(storageAnalytics, x0, 1);
            const d0 = storageAnalytics[i - 1];
            const d1 = storageAnalytics[i];
            const d = d1 && (x0.getTime() - new Date(d0.raw_date).getTime() > new Date(d1.raw_date).getTime() - x0.getTime()) ? d1 : d0;
            
            focus.attr("transform", `translate(${x(new Date(d.raw_date))},0)`);
            focus.select("circle").attr("cy", y(d.storage_mb));
          });
      };

      renderChart();
      window.addEventListener("resize", renderChart);
      return () => window.removeEventListener("resize", renderChart);
    }
  }, [mounted, storageAnalytics]);

  // Recharts Custom Tooltip
  const CustomAnalyticsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as StorageAnalyticsPoint;
      return (
        <div className="bg-[#0f0f10] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-md font-sans text-xs space-y-1.5">
          <p className="text-neutral-400 font-bold uppercase tracking-wider">{data.date}</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-white font-extrabold text-sm">{data.storage_mb} MB</span>
            <span className="text-neutral-500">total storage</span>
          </div>
          <p className="text-neutral-400 text-[11px] pt-1 border-t border-white/5">
            {data.snapshot_count} active database snapshot(s)
          </p>
        </div>
      );
    }
    return null;
  };

  // Analytics high-level stats
  const latestAnalyticsMb = storageAnalytics.length > 0 ? storageAnalytics[storageAnalytics.length - 1].storage_mb : 0;
  const maxAnalyticsMb = storageAnalytics.length > 0 ? Math.max(...storageAnalytics.map(a => a.storage_mb)) : 0;
  const avgAnalyticsMb = storageAnalytics.length > 0 ? parseFloat((storageAnalytics.reduce((acc, a) => acc + a.storage_mb, 0) / storageAnalytics.length).toFixed(1)) : 0;

  const checkStorageTrendAlert = () => {
    if (storageAnalytics.length < 5) return { warning: false, projectedMb: 0 };
    
    // Simple linear regression or avg growth rate of last 7 days
    const recent = storageAnalytics.slice(-7);
    const growthRates = [];
    for (let i = 1; i < recent.length; i++) {
      growthRates.push(recent[i].storage_mb - recent[i-1].storage_mb);
    }
    const avgDailyGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
    const projected48h = latestAnalyticsMb + (avgDailyGrowth * 2);
    
    const thresholdMb = settings.storage_threshold_gb * 1024;
    return {
      warning: projected48h >= thresholdMb,
      projectedMb: parseFloat(projected48h.toFixed(2)),
      avgDailyGrowth: parseFloat(avgDailyGrowth.toFixed(2))
    };
  };

  const trendAlert = checkStorageTrendAlert();

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a] backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-4 w-px bg-white/5 mx-2"></div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span>Infrastructure</span>
            <span className="text-neutral-700">/</span>
            <span className="text-white font-bold">Automated Backups</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-10">
        {/* Title Banner */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter flex items-center gap-3">
              <Database className="text-emerald-500" size={36} /> Automated Database Backups
            </h1>
            <p className="text-neutral-400 font-medium max-w-2xl">
              Configure automated local snapshots, storage analytics trends, admin failure alerts, and custom system health safety limits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateFailure}
              className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-3 rounded-2xl text-xs font-bold transition-all"
              title="Test backup failure email alert to administrator"
            >
              <AlertTriangle size={16} />
              <span>Test Failure Alert</span>
            </button>
            <button
              onClick={handleCreateSnapshot}
              disabled={creating}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
            >
              {creating ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              <span>Create Snapshot Now</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-5 shadow-xl">
            <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Backup Success Rate</p>
              <p className="text-3xl font-extrabold text-white mt-1">{summary ? `${summary.success_rate}%` : "100.0%"}</p>
              <p className="text-[11px] text-neutral-500 mt-1">{snapshots.filter(s => s.status === 'completed').length} of {snapshots.length} completed</p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-5 shadow-xl">
            <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <HardDrive size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Total Storage Consumed</p>
              <p className="text-3xl font-extrabold text-white mt-1">{summary ? formatSize(summary.total_storage_bytes) : "0 B"}</p>
              <p className="text-[11px] text-neutral-500 mt-1">{snapshots.length} total snapshot file(s)</p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-5 shadow-xl">
            <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Next Scheduled Backup</p>
              <p className="text-sm font-bold text-white mt-1 truncate max-w-[200px]">
                {summary?.next_scheduled_backup_at ? new Date(summary.next_scheduled_backup_at).toLocaleString() : "In 24 hours"}
              </p>
              <p className="text-[11px] text-amber-400 font-bold uppercase mt-1">Tier: {settings.frequency}</p>
            </div>
          </div>
        </div>

        {/* NEW: Storage Analytics Section (30-Day Recharts Trend) */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Storage Analytics (30-Day Area Chart)</h2>
                <p className="text-xs text-neutral-500 font-medium">Visualizing total database storage consumption trends and growth patterns</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-2">
                <span className="text-neutral-500">30-Day Current:</span>
                <span className="text-emerald-400 font-extrabold">{latestAnalyticsMb} MB</span>
              </div>
              <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-2">
                <span className="text-neutral-500">Peak:</span>
                <span className="text-white font-extrabold">{maxAnalyticsMb} MB</span>
              </div>
              <div className="px-4 py-2 bg-white/[0.03] border border-white/5 rounded-xl flex items-center gap-2">
                <span className="text-neutral-500">Daily Avg:</span>
                <span className="text-indigo-400 font-extrabold">{avgAnalyticsMb} MB</span>
              </div>
            </div>
          </div>

          <div className="h-[280px] w-full pt-4 relative">
            {mounted && storageAnalytics.length > 0 ? (
              <svg ref={d3Container} className="w-full h-full"></svg>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-600">
                <RefreshCw size={18} className="animate-spin mr-2" /> Loading Storage Analytics Chart...
              </div>
            )}
          </div>
        </div>

        {/* NEW: Storage Optimization Panel */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32"></div>
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-2xl text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <ShieldCheck size={12} /> Optimization Engine Active
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight">Storage Optimization</h2>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Our engine analyzed <span className="text-white font-bold">{snapshots.length}</span> snapshot files and identified redundant or outdated data that can be safely removed to reclaim disk space.
              </p>
              
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Estimated Savings</p>
                  <p className="text-xl font-extrabold text-emerald-400">{formatSize(optimizationData.totalOptimizable)}</p>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Redundant Files</p>
                  <p className="text-xl font-extrabold text-white">{optimizationData.ids.length}</p>
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">Storage Health</p>
                  <p className="text-xl font-extrabold text-indigo-400">{optimizationData.totalOptimizable > 1024 * 1024 * 100 ? "Action Recommended" : "Excellent"}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
              <div className="relative w-[220px] h-[220px]">
                <svg ref={d3PieContainer} className="w-full h-full"></svg>
              </div>
            </div>

            <button
              onClick={handleRunOptimization}
              disabled={optimizing || optimizationData.ids.length === 0}
              className="px-10 py-5 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold flex flex-col items-center gap-1 transition-all disabled:opacity-30 shadow-2xl shadow-emerald-500/20"
            >
              <div className="flex items-center gap-2">
                {optimizing ? <RefreshCw className="animate-spin" size={20} /> : <TrendingUp size={20} />}
                <span className="text-lg">Run Optimization</span>
              </div>
              <span className="text-[10px] uppercase tracking-widest opacity-70">Immediate Space Recovery</span>
            </button>
          </div>
        </div>



        {/* Configurations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Backup Schedule & Admin Notifications Card */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                  <HardDrive size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Backup Settings & Automated Schedule</h2>
                  <p className="text-xs text-neutral-500 font-medium">Local storage backup frequency and primary retention rules</p>
                </div>
              </div>
              <button
                onClick={() => setIsGlobalRetentionModalOpen(true)}
                className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all"
              >
                <Sliders size={14} />
                <span>Retention Limits</span>
              </button>
            </div>

            {/* NEW: Dedicated Automated Schedule Section */}
            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${settings.auto_backup_enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-neutral-500 border-white/5'}`}>
                      <Calendar size={18} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Automated Daily Backups</span>
                      <span className="text-[11px] text-neutral-400 block">Trigger a full database snapshot once every 24 hours</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.auto_backup_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_backup_enabled: e.target.checked })}
                    className="accent-emerald-500 w-6 h-6 rounded cursor-pointer"
                  />
                </div>

                {settings.auto_backup_enabled && (
                  <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest block ml-1">Daily Execution Time</label>
                      <p className="text-[11px] text-neutral-400">Backups will run daily at the selected time</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-emerald-400" />
                      <input
                        type="time"
                        value={dailyBackupTime}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          setDailyBackupTime(newTime);
                          const [hour, min] = newTime.split(":");
                          const newCron = `${parseInt(min)} ${parseInt(hour)} * * *`;
                          setSettings({ ...settings, cron_expression: newCron, frequency: 'daily' });
                        }}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-neutral-500 ml-1">Notifications & Advanced</h3>
                <button
                  onClick={handleExportLogs}
                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                  title="Generate CSV audit report of all backup attempts"
                >
                  <FileCode size={12} /> Export Logs (CSV)
                </button>
              </div>
              {/* Admin Notifications Toggle */}
              <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${settings.admin_notifications_enabled ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-white/5 text-neutral-500 border-white/5'}`}>
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Admin Email Notifications</span>
                    <span className="text-[11px] text-neutral-400 block">Dispatch email alerts to administrator contact when a database backup fails</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.admin_notifications_enabled}
                  onChange={(e) => setSettings({ ...settings, admin_notifications_enabled: e.target.checked })}
                  className="accent-emerald-500 w-5 h-5 rounded cursor-pointer"
                />
              </label>

              {settings.admin_notifications_enabled && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Administrator Contact Email</label>
                  <input
                    type="email"
                    placeholder="admin@ner-data-base.io"
                    value={settings.admin_contact_email}
                    onChange={(e) => setSettings({ ...settings, admin_contact_email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" /> Backup Frequency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {["6h", "daily", "weekly"].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => {
                        const nextSettings = { ...settings, frequency: freq };
                        if (freq === "6h") nextSettings.cron_expression = "0 */6 * * *";
                        setSettings(nextSettings);
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border ${
                        settings.frequency === freq
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {freq === "6h" ? "6 Hours" : freq === "daily" ? "Daily" : "Weekly"}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, frequency: "custom" })}
                    className={`py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border ${
                      settings.frequency === "custom"
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400"
                        : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              {settings.frequency === "custom" && (
                <div className="space-y-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest ml-1">Cron Schedule Expression</label>
                    <Link href="https://crontab.guru" target="_blank" className="text-[10px] font-bold text-neutral-500 hover:text-white underline uppercase">Helper</Link>
                  </div>
                  <input
                    type="text"
                    placeholder="0 0 * * *"
                    value={settings.cron_expression}
                    onChange={(e) => setSettings({ ...settings, cron_expression: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                  />
                  <p className="text-[10px] text-neutral-500 italic px-1">
                    Standard 5-field format: minute, hour, day, month, day-of-week.
                  </p>
                </div>
              )}

              {/* NEW: Bucket-specific frequency-based retention rules within the main card */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck size={14} className="text-emerald-400" /> Frequency-based Expiry Rules
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsGlobalRetentionModalOpen(true)}
                      className="text-[10px] font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <Sliders size={12} /> Global Limits
                    </button>
                    <button
                      onClick={handleSaveBucketPolicies}
                      className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                    >
                      {savingBucketPolicies ? "Saving..." : bucketPoliciesSaved ? "Saved!" : "Update Expiry"}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {bucketPolicies.map((bp, index) => (
                    <div key={bp.bucket_type} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-white/5 text-neutral-500">
                          <Database size={12} />
                        </div>
                        <span className="text-xs font-bold text-white capitalize">{bp.bucket_type}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <span className="text-[9px] text-neutral-600 font-bold uppercase">Auto</span>
                          <input
                            type="checkbox"
                            checked={bp.auto_prune_enabled}
                            onChange={(e) => {
                              const next = [...bucketPolicies];
                              next[index].auto_prune_enabled = e.target.checked;
                              setBucketPolicies(next);
                            }}
                            className="accent-emerald-500 w-3 h-3 rounded"
                          />
                        </label>
                        <div className="h-4 w-px bg-white/5"></div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={bp.retention_days}
                            onChange={(e) => {
                              const next = [...bucketPolicies];
                              next[index].retention_days = parseInt(e.target.value) || 1;
                              setBucketPolicies(next);
                            }}
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono w-14 focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-[10px] font-bold text-neutral-500 uppercase">Days</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NEW: Off-peak Hours Toggle & Window Picker */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${settings.off_peak_enabled ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-neutral-500 border-white/5'}`}>
                      <Clock size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Backup at Off-peak Hours</span>
                      <span className="text-[11px] text-neutral-400 block">Restrict automated backups to a specific low-traffic window</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.off_peak_enabled}
                    onChange={(e) => setSettings({ ...settings, off_peak_enabled: e.target.checked })}
                    className="accent-indigo-500 w-5 h-5 rounded cursor-pointer"
                  />
                </label>

                {settings.off_peak_enabled && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Window Start</label>
                      <input
                        type="time"
                        value={settings.off_peak_start}
                        onChange={(e) => setSettings({ ...settings, off_peak_start: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Window End</label>
                      <input
                        type="time"
                        value={settings.off_peak_end}
                        onChange={(e) => setSettings({ ...settings, off_peak_end: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-white/5">
                <p className="text-xs text-neutral-500">
                  Last Backup: <span className="text-neutral-300 font-bold">{settings.last_backup_at ? new Date(settings.last_backup_at).toLocaleString() : "None yet"}</span>
                </p>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className="bg-white text-black hover:bg-neutral-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={14} /> : savedSuccess ? <Check size={14} className="text-emerald-600" /> : <ShieldCheck size={14} />}
                  <span>{savedSuccess ? "Saved Policy!" : "Save Schedule"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Safety Limits Threshold Card */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <Sliders size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Health Safety Limits</h2>
                  <p className="text-xs text-neutral-500 font-medium">User-defined thresholds for header toast notifications</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" /> Max DB Latency Limit
                  </span>
                  <span className="text-emerald-400 font-mono text-sm">{dbLatencyLimit} ms</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={dbLatencyLimit}
                  onChange={(e) => setDbLatencyLimit(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 bg-white/10 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <HardDrive size={14} className="text-indigo-400" /> Max Redis Memory Limit
                  </span>
                  <span className="text-indigo-400 font-mono text-sm">{redisMemLimit} %</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="95"
                  step="5"
                  value={redisMemLimit}
                  onChange={(e) => setRedisMemLimit(parseInt(e.target.value))}
                  className="w-full accent-indigo-500 bg-white/10 h-2 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/5">
              <p className="text-xs text-neutral-500">Toasts trigger automatically when health crosses these limits.</p>
              <button
                onClick={handleSaveHealthLimits}
                className="bg-white/10 text-white hover:bg-white/20 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                {limitsSaved ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Sliders size={14} />}
                <span>{limitsSaved ? "Limits Saved!" : "Save Safety Limits"}</span>
              </button>
            </div>
          </div>

          {/* NEW: Storage Alerts Threshold Card */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-white/5 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <Bell size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Storage Capacity Alerts</h2>
                  <p className="text-xs text-neutral-500 font-medium">Set thresholds for cumulative snapshot storage notifications</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                    <HardDrive size={14} className="text-amber-400" /> Storage Threshold Limit
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={settings.storage_threshold_gb}
                      onChange={(e) => setSettings({ ...settings, storage_threshold_gb: parseInt(e.target.value) || 1 })}
                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono w-16 focus:outline-none focus:border-amber-500/50 text-right"
                    />
                    <span className="text-amber-400 font-mono text-xs uppercase">GB</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={settings.storage_threshold_gb > 100 ? 100 : settings.storage_threshold_gb}
                  onChange={(e) => setSettings({ ...settings, storage_threshold_gb: parseInt(e.target.value) })}
                  className="w-full accent-amber-500 bg-white/10 h-2 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Notification Channels</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <Mail size={16} className={settings.storage_alerts_email_enabled ? "text-emerald-400" : "text-neutral-500"} />
                      <span className="text-[11px] font-bold text-white">Email Alerts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.storage_alerts_email_enabled}
                      onChange={(e) => setSettings({ ...settings, storage_alerts_email_enabled: e.target.checked })}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      <Activity size={16} className={settings.storage_alerts_system_enabled ? "text-indigo-400" : "text-neutral-500"} />
                      <span className="text-[11px] font-bold text-white">System Alerts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.storage_alerts_system_enabled}
                      onChange={(e) => setSettings({ ...settings, storage_alerts_system_enabled: e.target.checked })}
                      className="accent-indigo-500 w-4 h-4 rounded cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Severity Thresholds */}
              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Severity Thresholds (%)</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <label className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter block">Warning</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.threshold_warning_percent}
                      onChange={(e) => setSettings({ ...settings, threshold_warning_percent: parseInt(e.target.value) || 50 })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="space-y-1.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                    <label className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter block">Critical</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.threshold_critical_percent}
                      onChange={(e) => setSettings({ ...settings, threshold_critical_percent: parseInt(e.target.value) || 75 })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-rose-500/50"
                    />
                  </div>
                  <div className="space-y-1.5 p-3 rounded-xl bg-rose-600/10 border border-rose-600/20">
                    <label className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter block">Fatal</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.threshold_fatal_percent}
                      onChange={(e) => setSettings({ ...settings, threshold_fatal_percent: parseInt(e.target.value) || 90 })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white font-mono outline-none focus:border-rose-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* NEW: AI Storage Trend Notification */}
              <div className="space-y-4 pt-2">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${settings.storage_trend_enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-neutral-500 border-white/5'}`}>
                      <TrendingUp size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Storage Trend Notification</span>
                      <span className="text-[11px] text-neutral-400 block">AI-driven projection for 48h threshold breaches</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.storage_trend_enabled}
                    onChange={(e) => setSettings({ ...settings, storage_trend_enabled: e.target.checked })}
                    className="accent-emerald-500 w-5 h-5 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* NEW: Alerts Log Section */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Capacity Alerts Log</p>
                  <button onClick={fetchAlertLogs} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors uppercase font-bold">Refresh</button>
                </div>
                <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="max-h-40 overflow-y-auto">
                    {alertLogs.length > 0 ? (
                      <table className="w-full text-left text-[10px]">
                        <thead className="sticky top-0 bg-[#0a0a0a] border-b border-white/5 text-neutral-500 uppercase tracking-tighter">
                          <tr>
                            <th className="px-3 py-2">Date</th>
                            <th className="px-3 py-2">Threshold</th>
                            <th className="px-3 py-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {alertLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02]">
                              <td className="px-3 py-2 text-neutral-400">{new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="px-3 py-2">
                                <span className={`font-bold ${log.severity === 'FATAL' ? 'text-rose-500' : log.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                                  {log.severity} ({log.threshold_percent}%)
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {log.notified_email && <Mail size={10} className="text-emerald-400" />}
                                    {log.notified_system && <Activity size={10} className="text-indigo-400" />}
                                  </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-8 text-center text-neutral-600 italic text-[11px]">
                        No historical storage alerts logged.
                      </div>
                    )}
                  </div>
                </div>
              </div>

            <div className="pt-4 flex items-center justify-between border-t border-white/5">
              <p className="text-[11px] text-neutral-500 max-w-[200px]">Triggers when total snapshots exceed {settings.storage_threshold_gb} GB.</p>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="bg-white text-black hover:bg-neutral-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="animate-spin" size={14} /> : savedSuccess ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Bell size={14} />}
                <span>{savedSuccess ? "Alerts Saved!" : "Save Alert Settings"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Snapshots History Table */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Local Storage Snapshots</h2>
                <p className="text-xs text-neutral-500 mt-1">Stored database snapshot files available for download or recovery</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                  title="Export filtered snapshots as JSON for audit"
                >
                  <Download size={14} />
                  <span>Export JSON</span>
                </button>
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  {filteredSnapshots.length} of {snapshots.length} Snapshots
                </span>
              </div>
            </div>

            {/* NEW: Triage Summary & Status Filters */}
            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                <div 
                  onClick={() => setStatusFilter("completed")}
                  className={`px-4 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${statusFilter === "completed" ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
                >
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Completed: {snapshots.filter(s => s.status === 'completed').length}</span>
                </div>
                <div 
                  onClick={() => setStatusFilter("failed")}
                  className={`px-4 py-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${statusFilter === "failed" ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'}`}
                >
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">Failed: {snapshots.filter(s => s.status === 'failed').length}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Quick Triage:</span>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${statusFilter === "all" ? 'bg-white text-black' : 'bg-white/5 text-neutral-400 hover:text-white'}`}
                >
                  Show All
                </button>
                <button
                  onClick={() => setStatusFilter("failed")}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${statusFilter === "failed" ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'}`}
                >
                  View Only Failed
                </button>
              </div>
            </div>

            {/* Filter controls bar */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search snapshot filename, frequency, status, or metadata tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 focus:border-indigo-500/50 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                  <Calendar size={14} className="text-neutral-400" />
                  <span className="text-neutral-500 text-[11px] font-medium">From:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none [color-scheme:dark]"
                  />
                </div>

                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                  <Calendar size={14} className="text-neutral-400" />
                  <span className="text-neutral-500 text-[11px] font-medium">To:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none [color-scheme:dark]"
                  />
                </div>

                {(searchQuery || startDate || endDate || selectedTagFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStartDate("");
                      setEndDate("");
                      setSelectedTagFilter("");
                    }}
                    className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  >
                    <X size={14} />
                    <span>Clear All Filters</span>
                  </button>
                )}
              </div>

              {/* Tag Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 mr-1">
                  <Tag size={12} className="text-emerald-400" /> Filter by Tag:
                </span>
                <button
                  onClick={() => setSelectedTagFilter("")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    selectedTagFilter === ""
                      ? "bg-white text-black"
                      : "bg-white/5 text-neutral-400 hover:text-white"
                  }`}
                >
                  All Tags
                </button>
                {["automated", "manual-run", "pre-deploy", "daily-backup", "weekly-retention", "compliance", "audit-archival"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? "" : tag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border flex items-center gap-1 ${
                      selectedTagFilter === tag
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                        : "bg-white/5 border-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <Hash size={10} className={selectedTagFilter === tag ? "text-emerald-400" : "text-neutral-500"} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans">
              <thead className="bg-white/[0.02] border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                      className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                      title={isAllFilteredSelected ? "Deselect All Filtered" : "Select All Filtered"}
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Snapshot Filename</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Metadata Tags</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Tier</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Frequency</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">File Size</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Created Date</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-neutral-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300">
                {filteredSnapshots.map((snap) => {
                  const isSelected = selectedSnapshotIds.includes(snap.id);
                  const isDeleting = animatingDeleteIds.includes(snap.id);
                  const tags = getTagsForSnapshot(snap);

                  return (
                    <tr
                      key={snap.id}
                      className={`transition-all duration-500 ease-in-out ${
                        isDeleting
                          ? "-translate-x-full opacity-0 scale-95 pointer-events-none bg-rose-500/20"
                          : isSelected
                          ? "bg-emerald-500/10 hover:bg-emerald-500/15"
                          : "hover:bg-white/[0.01]"
                      }`}
                    >
                      <td className="px-6 py-5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectSnapshot(snap.id)}
                          className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-white font-bold flex items-center gap-3">
                        <Database size={16} className="text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{snap.filename}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? "" : tag)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all border ${
                                selectedTagFilter === tag
                                  ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50"
                                  : "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white"
                              }`}
                              title={`Click to filter by tag '${tag}'`}
                            >
                              <Tag size={10} className="text-emerald-400" />
                              {tag}
                            </span>
                          ))}
                          <button
                            onClick={() => setEditingTagsSnapshot(snap)}
                            className="p-1 text-neutral-500 hover:text-emerald-400 hover:bg-white/10 rounded-md transition-colors"
                            title="Manage Custom Tags"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold uppercase">
                        <span className={`px-2.5 py-1 rounded-md border text-[9px] ${
                          snap.storage_tier === 'archive' 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {snap.storage_tier || 'standard'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-xs font-bold uppercase">
                        <span className={`px-2.5 py-1 rounded-md border text-[9px] ${
                          snap.frequency === 'manual' 
                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          {snap.frequency}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-neutral-400">{formatSize(snap.size_bytes)}</td>
                      <td className="px-6 py-5 text-xs font-bold">
                        {snap.status === 'failed' ? (
                          <span className="text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle size={14} /> Failed {settings.admin_notifications_enabled ? "(Email Alert Sent)" : "(Alerts Disabled)"}
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Completed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-xs text-neutral-400">{new Date(snap.created_at).toLocaleString()}</td>
                      <td className="px-6 py-5 text-right space-x-2">
                        <button
                          onClick={() => setPreviewSnapshot(snap)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl text-indigo-400 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                          title="Preview First 50 Lines"
                        >
                          <Eye size={15} />
                          <span>Preview</span>
                        </button>
                        <button
                          onClick={() => alert(`Downloading ${snap.filename}...`)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-neutral-400 hover:text-white transition-colors"
                          title="Download Snapshot"
                        >
                          <Download size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400 transition-colors"
                          title="Delete Snapshot"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredSnapshots.length === 0 && snapshots.length > 0 && (
                  <tr>
                    <td colSpan={8} className="px-8 py-16 text-center text-neutral-500">
                      <Filter size={32} className="mx-auto mb-3 text-neutral-600" />
                      <p className="text-sm font-bold">No matching snapshots found.</p>
                      <p className="text-xs text-neutral-600 mt-1">Try adjusting your search query, date range, or tag filters.</p>
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          setStartDate("");
                          setEndDate("");
                          setSelectedTagFilter("");
                        }}
                        className="mt-4 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                )}
                {snapshots.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-8 py-16 text-center text-neutral-500">
                      <AlertCircle size={32} className="mx-auto mb-3 text-neutral-600" />
                      <p className="text-sm font-bold">No database snapshots found.</p>
                      <p className="text-xs text-neutral-600 mt-1">Click &quot;Create Snapshot Now&quot; above to trigger a manual backup.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Floating Bulk Delete Action Bar */}
        {selectedSnapshotIds.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0f0f13] border border-white/15 px-6 py-3.5 rounded-2xl shadow-2xl shadow-black/80 flex items-center gap-6 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center gap-3 border-r border-white/10 pr-6">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-white">
                <span className="text-emerald-400 font-extrabold text-sm mr-1">{selectedSnapshotIds.length}</span>
                snapshot{selectedSnapshotIds.length > 1 ? "s" : ""} selected
              </span>
            </div>

            <button
              onClick={() => setSelectedSnapshotIds([])}
              className="text-xs text-neutral-400 hover:text-white transition-colors font-semibold"
            >
              Deselect All
            </button>

            <button
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="bg-rose-500 hover:bg-rose-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-500/20"
            >
              <Trash2 size={15} />
              <span>Bulk Delete ({selectedSnapshotIds.length})</span>
            </button>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {isBulkDeleteModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20">
                    <Trash2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Bulk Delete Snapshots</h3>
                    <p className="text-xs text-neutral-400">Confirm removal of selected backup files</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-start gap-3 text-rose-300 text-xs">
                  <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
                  <p className="leading-relaxed">
                    Warning: You are about to permanently delete <strong className="text-white">{selectedSnapshotIds.length} database snapshot file(s)</strong>. This action cannot be undone.
                  </p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Selected Snapshots:</p>
                  <ul className="space-y-1.5 font-mono text-xs text-neutral-300">
                    {snapshots
                      .filter(s => selectedSnapshotIds.includes(s.id))
                      .map(s => (
                        <li key={s.id} className="flex items-center justify-between py-0.5 border-b border-white/5 last:border-0">
                          <span className="truncate max-w-[240px] text-white">{s.filename}</span>
                          <span className="text-neutral-500 text-[11px]">{formatSize(s.size_bytes)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                <button
                  onClick={() => setIsBulkDeleteModalOpen(false)}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-rose-500/20"
                >
                  {isBulkDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  <span>{isBulkDeleting ? "Deleting..." : "Permanently Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Read-Only Code Editor Snapshot Preview Modal */}
        {previewSnapshot && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0c0c10] border border-white/10 rounded-3xl max-w-4xl w-full p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                    <FileCode size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white font-mono">{previewSnapshot.filename}</h3>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        First 50 Lines
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-3">
                      <span>Size: <strong className="text-white">{formatSize(previewSnapshot.size_bytes)}</strong></span>
                      <span>•</span>
                      <span>Tier: <strong className="text-white uppercase">{previewSnapshot.frequency}</strong></span>
                      <span>•</span>
                      <span>Created: <strong className="text-white">{new Date(previewSnapshot.created_at).toLocaleString()}</strong></span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPreviewSnapshot(null)}
                  className="text-neutral-500 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors self-start sm:self-auto"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Code Editor Container */}
              <div className="bg-[#050508] border border-white/10 rounded-2xl overflow-hidden font-mono text-xs">
                {/* Editor bar */}
                <div className="bg-white/[0.03] border-b border-white/5 px-4 py-2 flex items-center justify-between text-[11px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
                    <span className="ml-2 text-neutral-500 font-sans">Read-Only SQL Dump View (Lines 1–50)</span>
                  </div>
                  <span className="text-neutral-500 font-sans">utf-8 • postgresql</span>
                </div>

                {/* Lines Code Area */}
                <div className="p-4 overflow-x-auto max-h-[440px] overflow-y-auto space-y-1 selection:bg-indigo-500/30">
                  {generateSnapshotPreviewContent(previewSnapshot).map((line, idx) => (
                    <div key={idx} className="flex items-start hover:bg-white/[0.02] rounded px-1 group">
                      <span className="w-10 text-right pr-4 text-neutral-600 select-none text-[11px] shrink-0 border-r border-white/5 mr-3 group-hover:text-neutral-400">
                        {idx + 1}
                      </span>
                      <span className="whitespace-pre flex-1 text-xs leading-relaxed">
                        {renderCodeLine(line)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between border-t border-white/5 pt-4">
                <p className="text-xs text-neutral-500">
                  Viewing partial dump preview. Download full file for raw structure & dataset.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopyPreview(previewSnapshot)}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/5"
                  >
                    {copiedPreview ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedPreview ? "Copied 50 Lines!" : "Copy Preview"}</span>
                  </button>
                  <button
                    onClick={() => alert(`Downloading ${previewSnapshot.filename}...`)}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Download size={14} />
                    <span>Download Full File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Retention Limits Modal */}
        {isRetentionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-white/10 rounded-[2.5rem] max-w-2xl w-full p-10 space-y-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b border-white/5 pb-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-[1.5rem] border border-indigo-500/20">
                    <Sliders size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">Global Retention Limits</h3>
                    <p className="text-sm text-neutral-400">Define maximum file counts and storage volumes per frequency bucket.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsGlobalRetentionModalOpen(false)}
                  className="text-neutral-500 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex items-start gap-3 text-indigo-300 text-xs">
                  <AlertCircle size={20} className="shrink-0 text-indigo-400" />
                  <p className="leading-relaxed font-medium">
                    When these limits are hit, the oldest snapshots in the specific tier will be automatically purged to maintain system health, regardless of the expiration days.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {bucketPolicies.map((bp, index) => (
                    <div key={bp.bucket_type} className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                          <Database size={14} /> {bp.bucket_type} Tier
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Max Snapshot Count</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              value={bp.max_count || ""}
                              placeholder="Unlimited"
                              onChange={(e) => {
                                const next = [...bucketPolicies];
                                next[index].max_count = parseInt(e.target.value) || 0;
                                setBucketPolicies(next);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                            />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Files</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Max Cumulative Size</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              value={bp.max_size_gb || ""}
                              placeholder="Unlimited"
                              onChange={(e) => {
                                const next = [...bucketPolicies];
                                next[index].max_size_gb = parseInt(e.target.value) || 0;
                                setBucketPolicies(next);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                            />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">GB</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest ml-1">Archive After</label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              value={bp.archive_after_days || ""}
                              placeholder="Never"
                              onChange={(e) => {
                                const next = [...bucketPolicies];
                                next[index].archive_after_days = parseInt(e.target.value) || 0;
                                setBucketPolicies(next);
                              }}
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono outline-none focus:border-emerald-500/50"
                            />
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-8">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handlePruneSnapshots}
                    disabled={pruning}
                    className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                  >
                    {pruning ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />}
                    <span>Run Immediate Pruning</span>
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsGlobalRetentionModalOpen(false)}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-2xl text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      await handleSaveBucketPolicies();
                      alert("Global retention limits saved successfully.");
                      setIsGlobalRetentionModalOpen(false);
                    }}
                    disabled={savingBucketPolicies}
                    className="px-10 py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-extrabold transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {savingBucketPolicies ? "Saving..." : "Save Global Limits"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Custom Metadata Tag Management Modal */}
        {editingTagsSnapshot && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0f0f12] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                    <Tag size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Metadata Tags</h3>
                    <p className="text-xs text-neutral-400 font-mono truncate max-w-[260px]">{editingTagsSnapshot.filename}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTagsSnapshot(null)}
                  className="text-neutral-500 hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-neutral-400">
                  Add custom metadata tags to categorize and filter this snapshot record in history.
                </p>

                {/* Existing Tags list */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Active Tags</label>
                  <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                    {getTagsForSnapshot(editingTagsSnapshot).map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Tag size={12} className="text-emerald-400" />
                        {tag}
                        <button
                          onClick={() => handleRemoveTagFromSnapshot(editingTagsSnapshot.id, tag)}
                          className="hover:text-rose-400 ml-1 transition-colors"
                          title={`Remove tag '${tag}'`}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {getTagsForSnapshot(editingTagsSnapshot).length === 0 && (
                      <span className="text-xs text-neutral-600 italic">No custom tags attached yet.</span>
                    )}
                  </div>
                </div>

                {/* Add new tag form */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Add New Tag</label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddTagToSnapshot(editingTagsSnapshot.id, newTagInput);
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative flex-1">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="e.g. production, pre-deploy, legal-hold..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      Add Tag
                    </button>
                  </form>
                </div>

                {/* Quick Tag suggestions */}
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Quick Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["production", "staging", "pre-deploy", "audit-log", "compliance", "disaster-recovery", "verified"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleAddTagToSnapshot(editingTagsSnapshot.id, suggestion)}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-md text-[11px] font-medium transition-colors border border-white/5"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-white/5 pt-4">
                <button
                  onClick={() => setEditingTagsSnapshot(null)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  Done Editing
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
