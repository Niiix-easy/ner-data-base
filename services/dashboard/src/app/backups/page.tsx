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
}

interface BackupSettings {
  frequency: string;
  retention_days: number;
  auto_backup_enabled: boolean;
  admin_notifications_enabled: boolean;
  last_backup_at: string | null;
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
  auto_prune_enabled: boolean;
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
    last_backup_at: null,
  });

  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [storageAnalytics, setStorageAnalytics] = useState<StorageAnalyticsPoint[]>([]);
  const [bucketPolicies, setBucketPolicies] = useState<BucketPolicy[]>([
    { bucket_type: "daily", retention_days: 7, auto_prune_enabled: true },
    { bucket_type: "weekly", retention_days: 30, auto_prune_enabled: true },
    { bucket_type: "monthly", retention_days: 365, auto_prune_enabled: true },
  ]);
  const [savingBucketPolicies, setSavingBucketPolicies] = useState(false);
  const [bucketPoliciesSaved, setBucketPoliciesSaved] = useState(false);
  const [pruning, setPruning] = useState(false);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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

    return matchesSearch && matchesTagFilter && matchesDateRange;
  });

  useEffect(() => {
    setMounted(true);
    fetchSettingsAndSnapshots();
    const storedDbLat = localStorage.getItem("safety_limit_db_latency");
    const storedRedisMem = localStorage.getItem("safety_limit_redis_memory");
    if (storedDbLat) setDbLatencyLimit(parseInt(storedDbLat));
    if (storedRedisMem) setRedisMemLimit(parseInt(storedRedisMem));

    const storedTags = localStorage.getItem("snapshot_custom_tags");
    if (storedTags) {
      try {
        setSnapshotTags(JSON.parse(storedTags));
      } catch (err) {
        console.error("Failed to parse stored snapshot tags:", err);
      }
    }
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
          last_backup_at: data.last_backup_at || null,
        });
      }

      if (snapshotsRes.ok) {
        const list = await snapshotsRes.json();
        setSnapshots(list);
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

  const handleAddTagToSnapshot = (snapshotId: number, tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleaned) return;
    const targetSnap = snapshots.find((s) => s.id === snapshotId);
    if (!targetSnap) return;

    setSnapshotTags((prev) => {
      const current = prev[snapshotId] || getTagsForSnapshot(targetSnap);
      if (current.includes(cleaned)) return prev;
      const updated = { ...prev, [snapshotId]: [...current, cleaned] };
      localStorage.setItem("snapshot_custom_tags", JSON.stringify(updated));
      return updated;
    });
    setNewTagInput("");
  };

  const handleRemoveTagFromSnapshot = (snapshotId: number, tagToRemove: string) => {
    const targetSnap = snapshots.find((s) => s.id === snapshotId);
    if (!targetSnap) return;

    setSnapshotTags((prev) => {
      const current = prev[snapshotId] || getTagsForSnapshot(targetSnap);
      const updated = { ...prev, [snapshotId]: current.filter((t) => t !== tagToRemove) };
      localStorage.setItem("snapshot_custom_tags", JSON.stringify(updated));
      return updated;
    });
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
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
                <h2 className="text-xl font-bold">Storage Analytics (30-Day Trend)</h2>
                <p className="text-xs text-neutral-500 font-medium">Historical snapshot storage consumption and cumulative growth pattern</p>
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

          <div className="h-[280px] w-full pt-4">
            {mounted && storageAnalytics.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={storageAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#525252" 
                    tick={{ fill: "#737373", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#525252" 
                    tick={{ fill: "#737373", fontSize: 11 }}
                    tickFormatter={(val) => `${val} MB`}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomAnalyticsTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="storage_mb" 
                    stroke="#10b981" 
                    strokeWidth={2.5}
                    fillOpacity={1} 
                    fill="url(#storageGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-600">
                <RefreshCw size={18} className="animate-spin mr-2" /> Loading Storage Analytics Chart...
              </div>
            )}
          </div>
        </div>

        {/* Bucket Specific Retention Policies Section */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Sliders size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Bucket Specific Retention Policies</h2>
                <p className="text-xs text-neutral-500 font-medium">Define specific expiry days and auto-pruning rules for daily, weekly, and monthly buckets</p>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={handlePruneSnapshots}
                disabled={pruning}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                title="Execute snapshot retention pruning immediately"
              >
                {pruning ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} className="text-amber-400" />}
                <span>Prune Old Snapshots</span>
              </button>
              <button
                onClick={handleSaveBucketPolicies}
                disabled={savingBucketPolicies}
                className="bg-emerald-500 text-black hover:bg-emerald-400 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-md shadow-emerald-500/20"
              >
                {savingBucketPolicies ? <RefreshCw className="animate-spin" size={14} /> : bucketPoliciesSaved ? <Check size={14} /> : <ShieldCheck size={14} />}
                <span>{bucketPoliciesSaved ? "Policies Saved!" : "Save Bucket Policies"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bucketPolicies.map((bp, index) => (
              <div key={bp.bucket_type} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Database size={14} /> {bp.bucket_type} Bucket
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase">Auto-Prune</span>
                    <input
                      type="checkbox"
                      checked={bp.auto_prune_enabled}
                      onChange={(e) => {
                        const next = [...bucketPolicies];
                        next[index].auto_prune_enabled = e.target.checked;
                        setBucketPolicies(next);
                      }}
                      className="accent-emerald-500 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Expiry Period (Days)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      max="3650"
                      value={bp.retention_days}
                      onChange={(e) => {
                        const next = [...bucketPolicies];
                        next[index].retention_days = parseInt(e.target.value) || 1;
                        setBucketPolicies(next);
                      }}
                      className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white font-mono w-full focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                    <span className="text-xs font-bold text-neutral-500">Days</span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500">
                  Snapshots in <span className="text-white font-bold">{bp.bucket_type}</span> older than <span className="text-amber-400 font-bold">{bp.retention_days} days</span> are purged automatically.
                </p>
              </div>
            ))}
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
                  <h2 className="text-xl font-bold">Automated Schedule Policy</h2>
                  <p className="text-xs text-neutral-500 font-medium">Local storage backup frequency and primary retention rules</p>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-xs font-bold text-neutral-400">Auto-Backup</span>
                <input
                  type="checkbox"
                  checked={settings.auto_backup_enabled}
                  onChange={(e) => setSettings({ ...settings, auto_backup_enabled: e.target.checked })}
                  className="accent-emerald-500 w-5 h-5 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-6">
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

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" /> Backup Frequency
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {["daily", "weekly"].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setSettings({ ...settings, frequency: freq })}
                      className={`py-3 px-4 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border ${
                        settings.frequency === freq
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {freq === "daily" ? "Daily (Every 24h)" : "Weekly (Every 7 Days)"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" /> Default Retention
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setSettings({ ...settings, retention_days: days })}
                      className={`py-3 px-3 rounded-xl text-xs font-bold transition-all border ${
                        settings.retention_days === days
                          ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                          : "bg-white/5 border-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Keep {days} Days
                    </button>
                  ))}
                </div>
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
        </div>

        {/* Snapshots History Table */}
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Local Storage Snapshots</h2>
                <p className="text-xs text-neutral-500 mt-1">Stored database snapshot files available for download or recovery</p>
              </div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                {filteredSnapshots.length} of {snapshots.length} Snapshots
              </span>
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
