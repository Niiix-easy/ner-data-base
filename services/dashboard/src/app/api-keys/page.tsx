"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowLeft,
  Database,
  ShieldCheck,
  Clock,
  MoreHorizontal,
  AlertCircle,
  RefreshCw,
  Activity,
  X,
  History,
  AlertTriangle,
  Search,
  Download,
  ArrowUpRight,
  Calendar
} from "lucide-react";
import { HourlyHeatmap } from "@/components/dashboard/HourlyHeatmap";
import { WebhookSuccessChart } from "@/components/dashboard/WebhookSuccessChart";

interface ApiKey {
  id: number;
  name: string;
  alias: string | null;
  key_value: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  usage_count: number;
  environment: string;
  tags: string[];
  rotation_interval_days: number | null;
  next_rotation_at: string | null;
  rpm_limit: number;
  daily_usage_limit: number | null;
  user_id: number | null;
}

interface UsageLog {
  id: number;
  method: string;
  path: string;
  status_code: number;
  ip_address: string;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyTags, setNewKeyTags] = useState("");
  const [expirationDays, setExpirationDays] = useState("0");
  const [rpmLimit, setRpmLimit] = useState("100");
  const [dailyUsageLimit, setDailyUsageLimit] = useState("");
  const [newKeyAlias, setNewKeyAlias] = useState("");
  const [rotationInterval, setRotationInterval] = useState("0");
  const [selectedEnv, setSelectedEnv] = useState("production");
  const [showKeyId, setShowKeyId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "usage_count">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [envFilter, setEnvFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"keys" | "activity" | "webhooks">("keys");
  const [rotationWarningKey, setRotationWarningKey] = useState<ApiKey | null>(null);
  const [selectedLogsKey, setSelectedLogsKey] = useState<ApiKey | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);
  
  const [activityFilter, setActivityFilter] = useState<'all' | 'CREATED' | 'ROTATED' | 'REVOKED'>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState("CREATED");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<any[] | null>(null);
  const [testResult, setTestResult] = useState<{status: number, headers: any, body: any} | null>(null);
  const [webhookStats, setWebhookStats] = useState({ successRate: 0, totalDelivered: 0, pendingRetries: 0 });
  const [toast, setToast] = useState<{message: string, key?: string} | null>(null);
  const [rpmModalKey, setRpmModalKey] = useState<ApiKey | null>(null);
  const [newRpmLimit, setNewRpmLimit] = useState("");
  const [selectedKeyForTag, setSelectedKeyForTag] = useState<ApiKey | null>(null);
  const [newTags, setNewTags] = useState("");
  const [qrModalKey, setQrModalKey] = useState<ApiKey | null>(null);

  useEffect(() => {
    fetchUser();
    fetchKeys();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/control-plane/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  useEffect(() => {
    const soon = 7 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const count = keys.filter(k => 
      k.expires_at && 
      !k.revoked_at && 
      (new Date(k.expires_at).getTime() - now) > 0 &&
      (new Date(k.expires_at).getTime() - now) < soon
    ).length;
    
    setExpiringSoonCount(count);
  }, [keys]);

  useEffect(() => {
    if (activeTab === "activity") {
      fetchActivity();
    } else if (activeTab === "webhooks") {
      fetchWebhooks();
      fetchWebhookStats();
    }
  }, [activeTab]);

  const fetchWebhookStats = async () => {
      try {
          const res = await fetch("/api/control-plane/api-keys/webhooks/stats");
          const data = await res.json();
          setWebhookStats(data);
      } catch (err) {
          console.error(err);
      }
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch("/api/control-plane/api-keys/activity");
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      const data = await res.json();
      setActivityLogs(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoadingActivity(false);
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await fetch("/api/control-plane/api-keys/webhooks");
      if (!res.ok) throw new Error("Failed to fetch webhooks");
      const data = await res.json();
      setWebhooks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetryWebhook = async (webhookId: number) => {
    try {
      await fetch(`/api/control-plane/api-keys/webhooks/${webhookId}/retry`, { method: "POST" });
      fetchWebhooks();
    } catch (err) {
      alert("Failed to retry webhook");
    }
  };

  const handleTestWebhook = async (id: number, url: string, eventType: string) => {
    try {
      const res = await fetch(`/api/control-plane/api-keys/${id}/webhooks/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, eventType })
      });
      const data = await res.json();
      setTestResult({ status: data.status, headers: data.headers, body: data.body });
    } catch (err: any) {
      alert(`Test failed: ${err.message}`);
    }
  };

  const handleUpdateRpm = async () => {
    if (!rpmModalKey) return;
    try {
        await fetch(`/api/control-plane/api-keys/${rpmModalKey.id}/rpm-limit`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rpmLimit: parseInt(newRpmLimit) })
        });
        fetchKeys();
        setRpmModalKey(null);
    } catch (err: any) {
        alert("Failed to update RPM limit");
    }
  };

  const fetchWebhookLogs = async (webhookId: number) => {
    try {
      const res = await fetch(`/api/control-plane/api-keys/webhooks/${webhookId}/logs`);
      const data = await res.json();
      setSelectedWebhookLogs(data);
    } catch (err) {
      alert("Failed to fetch logs");
    }
  };

  const handleRetryAll = async () => {
      try {
          await fetch("/api/control-plane/api-keys/webhooks/retry-all", { method: "POST" });
          fetchWebhooks();
          fetchWebhookStats();
      } catch (err) {
          alert("Failed to retry webhooks");
      }
  };

  const handleUpdateTags = async () => {
    if (!selectedKeyForTag) return;
    try {
        await fetch(`/api/control-plane/api-keys/${selectedKeyForTag.id}/tags`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tags: newTags.split(",").map(t => t.trim()).filter(t => t !== "") })
        });
        fetchKeys();
        setSelectedKeyForTag(null);
    } catch (err: any) {
        alert("Failed to update tags");
    }
  };

  const [selectedKeyForWebhook, setSelectedKeyForWebhook] = useState<number | null>(null);

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeyForWebhook || !webhookUrl) return;
    try {
      await fetch(`/api/control-plane/api-keys/${selectedKeyForWebhook}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, eventType: webhookEvent, sharedSecret: webhookSecret })
      });
      fetchWebhooks();
      setWebhookUrl("");
      setWebhookSecret("");
    } catch (err: any) {
      alert("Failed to create webhook");
    }
  };

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/control-plane/api-keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setGenerating(true);
    try {
      let expiresAt = null;
      if (expirationDays !== "0") {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expirationDays));
        expiresAt = date.toISOString();
      }

      const res = await fetch("/api/control-plane/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newKeyName,
          alias: newKeyAlias,
          expiresAt: expiresAt,
          environment: selectedEnv,
          tags: newKeyTags.split(",").map(t => t.trim()).filter(t => t !== ""),
          userId: currentUser?.id,
          rotationIntervalDays: rotationInterval !== "0" ? parseInt(rotationInterval) : null,
          rpmLimit: parseInt(rpmLimit),
          dailyUsageLimit: dailyUsageLimit ? parseInt(dailyUsageLimit) : null
        }),
      });
      if (!res.ok) throw new Error("Failed to generate API key");
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
      setNewKeyName("");
      setNewKeyAlias("");
      setNewKeyTags("");
      setExpirationDays("0");
      setRotationInterval("0");
      setRpmLimit("100");
      setDailyUsageLimit("");
      setShowKeyId(newKey.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRotate = async (id: number) => {
    try {
      const res = await fetch(`/api/control-plane/api-keys/${id}/rotate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to rotate API key");
      const updatedKey = await res.json();
      
      setKeys(keys.map(k => k.id === id ? { ...updatedKey, usage_count: k.usage_count } : k));
      setShowKeyId(id);
      setRotationWarningKey(updatedKey);
      setToast({ message: "Key rotated. Old key invalidated.", key: updatedKey.key_value });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchLogs = async (key: ApiKey) => {
    setSelectedLogsKey(key);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/control-plane/api-keys/${key.id}/logs`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    try {
      const res = await fetch(`/api/control-plane/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke API key");
      setKeys(keys.map(k => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleBulkAction = async (action: 'revoke') => {
    if (!confirm(`Are you sure you want to ${action} ${selectedKeys.size} keys?`)) return;
    for (const id of Array.from(selectedKeys)) {
      if (action === 'revoke') {
        try {
          await fetch(`/api/control-plane/api-keys/${id}`, { method: "DELETE" });
          setKeys(prev => prev.map(k => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
        } catch (err) {
          console.error(`Failed to revoke ${id}:`, err);
        }
      }
    }
    setSelectedKeys(new Set());
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (key: string) => {
    const prefix = key.substring(0, 5);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${"*".repeat(key.length - 9)}${suffix}`;
  };

  const filteredKeys = keys.filter(k => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      k.name.toLowerCase().includes(searchLower) ||
      k.environment.toLowerCase().includes(searchLower) ||
      (k.tags && k.tags.some(tag => tag.toLowerCase().includes(searchLower)));
    
    const matchesEnv = envFilter === "all" || k.environment === envFilter;
    const matchesTag = tagFilter === "all" || (k.tags && k.tags.includes(tagFilter));
    return matchesSearch && matchesEnv && matchesTag;
  }).sort((a, b) => {
    let comparison = 0;
    if (sortBy === "name") comparison = a.name.localeCompare(b.name);
    else if (sortBy === "created_at") comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    else if (sortBy === "usage_count") comparison = a.usage_count - b.usage_count;
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const handleDownloadCSV = () => {
    const headers = ["ID", "Name", "Environment", "Tags", "Created At", "Expires At", "Status", "Usage Count"];
    const rows = filteredKeys.map(k => {
      const status = k.revoked_at ? "Revoked" : (k.expires_at && new Date(k.expires_at) < new Date() ? "Expired" : "Active");
      return [
        k.id,
        k.name,
        k.environment,
        (k.tags || []).join(";"),
        new Date(k.created_at).toISOString(),
        k.expires_at ? new Date(k.expires_at).toISOString() : "Never",
        status,
        k.usage_count
      ];
    });
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `api_keys_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allTags = Array.from(new Set(keys.flatMap(k => k.tags || [])));
  
  const allTags = Array.from(new Set(keys.flatMap(k => k.tags || [])));
  
  const totalActiveKeys = keys.filter(k => !k.revoked_at && (!k.expires_at || new Date(k.expires_at) > new Date())).length;
  const expiringSoonCount = keys.filter(k => k.expires_at && !k.revoked_at && (new Date(k.expires_at).getTime() - new Date().getTime()) < 7 * 24 * 60 * 60 * 1000).length;
  const totalRequests = keys.reduce((sum, k) => sum + k.usage_count, 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30 relative">
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a] backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-4 w-px bg-white/5 mx-2"></div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span>Projects</span>
            <span className="text-neutral-700">/</span>
            <span className="text-white font-bold">API Keys</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Search keys..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all w-64"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-8">
        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Active Keys', value: totalActiveKeys, icon: Key, color: 'text-emerald-500' },
            { label: 'Expiring Soon', value: expiringSoonCount, icon: AlertTriangle, color: 'text-amber-500' },
            { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-indigo-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-8">
        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Active Keys', value: totalActiveKeys, icon: Key, color: 'text-emerald-500' },
            { label: 'Expiring Soon', value: expiringSoonCount, icon: AlertTriangle, color: 'text-amber-500' },
            { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-indigo-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
            <input 
              type="text" 
              placeholder="Search keys..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all w-72 text-white"
            />
          </div>
          <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all text-neutral-400 hover:text-white">
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-12">
        {/* Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Active Keys', value: totalActiveKeys, icon: Key, color: 'text-emerald-500' },
            { label: 'Expiring Soon', value: expiringSoonCount, icon: AlertTriangle, color: 'text-amber-500' },
            { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: Activity, color: 'text-indigo-500' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-xl">
              <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">API Keys</h1>
            <p className="text-neutral-500 font-medium max-w-2xl">Gerencie chaves de acesso para seu projeto.</p>
          </div>
           <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-[#0a0a0a] border border-white/5 p-2 rounded-2xl shadow-xl">
             <input type="text" placeholder="Nome da chave" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-64 text-white" required />
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <input type="text" placeholder="Alias" value={newKeyAlias} onChange={(e) => setNewKeyAlias(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-32 text-white" />
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <input type="text" placeholder="Tags (comma separated)" value={newKeyTags} onChange={(e) => setNewKeyTags(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-48 text-white" />
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <input type="number" placeholder="Daily Limit" value={dailyUsageLimit} onChange={(e) => setDailyUsageLimit(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-32 text-white" min="1" />
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs px-4 py-2 text-neutral-400 font-bold uppercase cursor-pointer">
               <option value="production" className="bg-[#0a0a0a]">Production</option>
               <option value="staging" className="bg-[#0a0a0a]">Staging</option>
               <option value="development" className="bg-[#0a0a0a]">Development</option>
             </select>
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <select value={expirationDays} onChange={(e) => setExpirationDays(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs px-4 py-2 text-neutral-400 font-bold uppercase cursor-pointer">
               <option value="0" className="bg-[#0a0a0a]">Never Expires</option>
               <option value="1" className="bg-[#0a0a0a]">24 Hours</option>
               <option value="7" className="bg-[#0a0a0a]">7 Days</option>
               <option value="30" className="bg-[#0a0a0a]">30 Days</option>
             </select>
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <select value={rotationInterval} onChange={(e) => setRotationInterval(e.target.value)} className="bg-transparent border-none focus:ring-0 text-xs px-4 py-2 text-indigo-400 font-bold uppercase cursor-pointer">
               <option value="0" className="bg-[#0a0a0a]">Manual Rotation</option>
               <option value="30" className="bg-[#0a0a0a]">30 Days</option>
               <option value="60" className="bg-[#0a0a0a]">60 Days</option>
               <option value="90" className="bg-[#0a0a0a]">90 Days</option>
             </select>
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <input type="number" placeholder="RPM" value={rpmLimit} onChange={(e) => setRpmLimit(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-20 text-white" min="1" />
             <button type="submit" disabled={generating || !newKeyName.trim()} className="flex items-center justify-center gap-2 bg-white text-black px-6 py-2 rounded-xl text-xs font-bold hover:bg-neutral-200 disabled:opacity-50">
               {generating ? "Gerando..." : <><Plus size={14} /> Criar Chave</>}
             </button>
          </form>
        </div>

        <div className="flex items-center gap-8 border-b border-white/5">
           <button onClick={() => setActiveTab("keys")} className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === "keys" ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
             Gerenciar Chaves
             {activeTab === "keys" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
           </button>
           <button onClick={() => setActiveTab("activity")} className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === "activity" ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
             Atividade Global
             {activeTab === "activity" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
           </button>
           <button onClick={() => setActiveTab("webhooks")} className={`pb-4 text-sm font-bold uppercase tracking-widest relative ${activeTab === "webhooks" ? 'text-white' : 'text-neutral-600 hover:text-neutral-400'}`}>
             Webhooks
             {activeTab === "webhooks" && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>}
           </button>
        </div>

        {activeTab === "keys" ? (
          <section className="space-y-6">
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2 bg-[#0a0a0a] p-1 border border-white/5 rounded-xl">
                     {["all", "production", "staging", "development"].map((env) => (
                        <button key={env} onClick={() => setEnvFilter(env)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${envFilter === env ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}>
                          {env}
                        </button>
                     ))}
                  </div>
                  <div className="flex items-center gap-2 bg-[#0a0a0a] p-1 border border-white/5 rounded-xl overflow-x-auto max-w-md">
                     <button onClick={() => setTagFilter("all")} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${tagFilter === "all" ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:text-white'}`}>
                       All Tags
                     </button>
                     {allTags.map((tag) => (
                        <button key={tag} onClick={() => setTagFilter(tag)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${tagFilter === tag ? 'bg-indigo-500 text-white' : 'text-neutral-500 hover:text-white'}`}>
                          {tag}
                        </button>
                     ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-[#0a0a0a] p-1 border border-white/5 rounded-xl">
                   <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="bg-transparent border-none focus:ring-0 text-[10px] font-bold uppercase text-neutral-400 cursor-pointer">
                      <option value="name" className="bg-[#0a0a0a]">Sort by Name</option>
                      <option value="created_at" className="bg-[#0a0a0a]">Sort by Date</option>
                      <option value="usage_count" className="bg-[#0a0a0a]">Sort by Usage</option>
                   </select>
                   <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white border border-white/5">
                      {sortOrder === 'asc' ? <ArrowUpRight size={14} /> : <MoreHorizontal size={14} className="rotate-90" />}
                   </button>
                </div>
              </div>
            </div>
           
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                 {[1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />)}
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="p-20 text-center bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] opacity-50">
                 <Key size={32} className="mx-auto mb-4" />
                 <p className="text-lg font-bold">Nenhuma chave encontrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                 {filteredKeys.map((key) => (
                   <div key={key.id} className={`flex items-center gap-4 bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 ${key.revoked_at ? 'opacity-40' : ''}`}>
                     <input type="checkbox" checked={selectedKeys.has(key.id)} onChange={(e) => {
                       const next = new Set(selectedKeys);
                       if (e.target.checked) next.add(key.id);
                       else next.delete(key.id);
                       setSelectedKeys(next);
                     }} className="accent-emerald-500 w-5 h-5" />
                     <div className="flex-1 group relative overflow-hidden">
                       <div className="absolute top-0 right-0 flex items-center gap-2">
                         {!key.revoked_at && (
                           <>
                             <button onClick={() => handleRotate(key.id)} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-400 hover:text-white flex items-center gap-2 text-xs font-bold">
                               <RefreshCw size={14} /> Rotate
                             </button>
                             <button onClick={() => handleRevoke(key.id)} className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-neutral-600 hover:text-rose-500">
                               <Trash2 size={16} />
                             </button>
                           </>
                         )}
                       </div>
                       <div className="flex flex-col gap-8">
                          <div className="space-y-4">
                             <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${key.revoked_at ? 'text-neutral-700' : 'text-indigo-400'}`}>
                                  <Database size={20} />
                               </div>
                               <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white">
                                     {key.name}
                                     {key.alias && <span className="ml-2 text-sm font-normal text-neutral-500">({key.alias})</span>}
                                   </h3>
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${key.environment === 'production' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>{key.environment}</span>
                                    {key.revoked_at ? (
                                      <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-bold uppercase rounded-md">Revoked</span>
                                    ) : key.expires_at && new Date(key.expires_at) < new Date() ? (
                                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-bold uppercase rounded-md">Expired</span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[8px] font-bold uppercase rounded-md">Active</span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-2">
                                     {key.tags && key.tags.map(tag => (
                                       <span key={tag} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-bold text-neutral-400 uppercase">{tag}</span>
                                     ))}
                                  </div>
                                  <div className="flex items-center gap-4 mt-3">
                                     <p className="text-[10px] text-neutral-600 font-bold uppercase flex items-center gap-1.5"><Clock size={10} /> Created {new Date(key.created_at).toLocaleDateString()}</p>
                                     {key.rotation_interval_days && <p className="text-[10px] text-indigo-500 font-bold uppercase flex items-center gap-1.5"><RefreshCw size={10} /> Auto-rotate ({key.rotation_interval_days}d)</p>}
                                     <button onClick={() => fetchLogs(key)} className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1.5 hover:text-emerald-400"><Activity size={10} /> {key.usage_count} Requests</button>
                                  </div>
                               </div>
                             </div>
                             <div className="flex items-center gap-2">
                                <div className="flex-1 bg-[#060606] border border-white/5 rounded-xl px-5 py-4 font-mono text-sm text-neutral-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                   {showKeyId === key.id ? key.key_value : maskKey(key.key_value)}
                                </div>
                                {!key.revoked_at && (
                                  <button onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)} className="p-4 hover:bg-white/5 rounded-2xl text-neutral-500">
                                    {showKeyId === key.id ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                                )}
                             </div>
                          </div>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
            
        {selectedKeys.size > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0a0a0a] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[300]">
                <span className="text-sm font-bold text-white">{selectedKeys.size} key(s) selected</span>
                <button onClick={() => handleBulkAction('revoke')} className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-sm font-bold hover:bg-rose-500/20">Revoke / Delete</button>
              </div>
            )}
          </section>
        ) : activeTab === "activity" ? (
          <section className="space-y-8">
             <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Atividade Recente</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <input type="text" placeholder="Filter by entity..." onChange={(e) => {/* Implement filtering */}} className="bg-white/5 border-none rounded-lg text-xs p-2 text-white" />
                    <select onChange={(e) => setActivityFilter(e.target.value as any)} className="bg-white/5 border-none rounded-lg text-xs p-2 text-white">
                        <option value="all">All Events</option>
                        <option value="CREATED">CREATED</option>
                        <option value="ROTATED">ROTATED</option>
                        <option value="REVOKED">REVOKED</option>
                    </select>
                </div>
             </div>
             {loadingActivity ? (
               <div className="space-y-4">
                 {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)}
               </div>
             ) : (
               <div className="space-y-4">
                  {activityLogs.filter(l => activityFilter === 'all' || l.event_type === activityFilter).map((log) => (
                    <div key={log.id} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-emerald-500/20 transition-all group">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.event_type === 'CREATED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {log.event_type === 'CREATED' ? <Plus size={18} /> : log.event_type === 'ROTATED' ? <RefreshCw size={18} /> : <Trash2 size={18} />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-white">Chave <button onClick={() => {
                                  const key = keys.find(k => k.id === log.api_key_id);
                                  if (key) fetchLogs(key);
                                }} className="text-indigo-400 hover:underline">"{log.key_name}"</button> {log.event_type === 'CREATED' ? 'gerada' : log.event_type === 'ROTATED' ? 'rotacionada' : 'revogada'}</p>
                                <p className="text-[10px] text-neutral-600 font-bold uppercase mt-1">ID: {log.api_key_id}</p>
                              </div>
                           </div>
                           <p className="text-[10px] text-neutral-500 uppercase">{new Date(log.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                  ))}
               </div>
             )}
          </section>
        ) : (
          <section className="space-y-8">
             <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Register Webhook</h2>
             <form onSubmit={handleCreateWebhook} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 flex gap-4">
                <select value={selectedKeyForWebhook || ""} onChange={(e) => setSelectedKeyForWebhook(Number(e.target.value))} className="bg-white/5 border-none rounded-xl text-sm p-2 text-white">
                  <option value="">Select Key</option>
                  {keys.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
                <input placeholder="URL" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="bg-white/5 border-none rounded-xl text-sm p-2 text-white flex-1" />
                <select value={webhookEvent} onChange={(e) => setWebhookEvent(e.target.value)} className="bg-white/5 border-none rounded-xl text-sm p-2 text-white">
                  <option value="CREATED">CREATED</option>
                  <option value="ROTATED">ROTATED</option>
                  <option value="REVOKED">REVOKED</option>
                </select>
                <input placeholder="Secret" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="bg-white/5 border-none rounded-xl text-sm p-2 text-white" />
                <button type="submit" className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Create</button>
             </form>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Success Rate', value: `${webhookStats.successRate}%`, color: 'text-emerald-500' },
                  { label: 'Total Delivered', value: webhookStats.totalDelivered, color: 'text-indigo-500' },
                  { label: 'Pending Retries', value: webhookStats.pendingRetries, color: 'text-rose-500' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
             </div>
             <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
                <h3 className="text-md font-bold mb-4">Schedule Webhook</h3>
                <div className="flex gap-4">
                  <select value={selectedKeyForWebhook || ""} onChange={(e) => setSelectedKeyForWebhook(Number(e.target.value))} className="bg-white/5 border-none rounded-xl text-sm p-2 text-white">
                      <option value="">Select Key</option>
                      {keys.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                  <input type="datetime-local" className="bg-white/5 border-none rounded-xl text-sm p-2 text-white" />
                  <button className="bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold">Schedule</button>
                </div>
             </div>
             
             <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
                <h3 className="text-md font-bold mb-4">Debug Console</h3>
                <div className="bg-black p-4 rounded-xl font-mono text-xs text-emerald-500 h-40 overflow-y-auto">
                    {" > Triggering manual webhook..."}
                    {" > Request: POST /webhook/test"}
                    {" > Response: 200 OK"}
                </div>
             </div>
             <WebhookSuccessChart />
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Webhooks Registrados</h2>
                <button onClick={handleRetryAll} className="bg-white/5 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/10">Retry All Failed</button>
             </div>
             <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden">
               <table className="w-full text-left text-sm text-neutral-400">
                  <thead className="bg-white/[0.03] border-b border-white/5">
                     <tr>
                        <th className="px-6 py-4">API Key</th>
                        <th className="px-6 py-4">URL</th>
                        <th className="px-6 py-4">Event</th>
                        <th className="px-6 py-4">Retries</th>
                        <th className="px-6 py-4">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                     {webhooks.map((wh) => (
                        <tr key={wh.id}>
                           <td className="px-6 py-4 font-mono text-xs">{wh.key_name}</td>
                           <td className="px-6 py-4 truncate max-w-xs">{wh.url}</td>
                           <td className="px-6 py-4">{wh.event_type}</td>
                           <td className="px-6 py-4">{wh.retries}</td>
                           <td className="px-6 py-4 flex gap-2">
                              <button onClick={() => handleRetryWebhook(wh.id)} className="text-emerald-500 text-xs font-bold hover:underline">Retry</button>
                              <button onClick={() => fetchWebhookLogs(wh.id)} className="text-indigo-400 text-xs font-bold hover:underline">Logs</button>
                              <button onClick={() => handleTestWebhook(wh.api_key_id, wh.url, wh.event_type)} className="text-amber-500 text-xs font-bold hover:underline">Test</button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
               {webhooks.length === 0 && <p className="p-8 text-center text-neutral-500">No webhooks found.</p>}
             </div>
          </section>
        )}
        
        {selectedWebhookLogs && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
               <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-3xl flex flex-col gap-4">
                  <h3 className="text-xl font-bold">Delivery Logs</h3>
                  <div className="flex-1 overflow-auto max-h-[60vh] space-y-2">
                    {selectedWebhookLogs.map((log: any, i: number) => (
                      <div key={i} className="bg-white/5 p-4 rounded-xl text-xs font-mono">
                        <p>{log.created_at} | Status: {log.response_status} | Latency: {log.latency_ms}ms</p>
                        <p className="truncate">Payload: {JSON.stringify(log.payload)}</p>
                      </div>
                    ))}
                    {selectedWebhookLogs.length === 0 && <p>No logs found.</p>}
                  </div>
                  <button onClick={() => setSelectedWebhookLogs(null)} className="bg-white text-black py-2 rounded-xl text-sm font-bold">Close</button>
               </div>
            </div>
        )}
        {testResult && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
               <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-lg flex flex-col gap-4">
                  <h3 className="text-xl font-bold">Test Response</h3>
                  <div className="text-xs font-mono bg-white/5 p-4 rounded-xl space-y-2">
                      <p>Status: {testResult.status}</p>
                      <p>Headers: {JSON.stringify(testResult.headers, null, 2)}</p>
                      <p>Body: {JSON.stringify(testResult.body, null, 2)}</p>
                  </div>
                  <button onClick={() => setTestResult(null)} className="bg-white text-black py-2 rounded-xl text-sm font-bold">Close</button>
               </div>
            </div>
        )}

        {rpmModalKey && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
               <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col gap-4">
                  <h3 className="text-xl font-bold">Configure RPM Limit</h3>
                  <input type="number" value={newRpmLimit} onChange={(e) => setNewRpmLimit(e.target.value)} className="bg-white/5 border-none rounded-xl text-sm p-3 text-white" />
                  <div className="flex gap-4">
                    <button onClick={() => setRpmModalKey(null)} className="flex-1 bg-white/5 text-white py-2 rounded-xl text-sm font-bold">Cancel</button>
                    <button onClick={handleUpdateRpm} className="flex-1 bg-indigo-500 text-white py-2 rounded-xl text-sm font-bold">Save</button>
                  </div>
               </div>
            </div>
        )}

        {selectedKeyForTag && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
               <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 w-full max-w-sm flex flex-col gap-4">
                  <h3 className="text-xl font-bold">Edit Tags</h3>
                  <input type="text" placeholder="Tags (comma separated)" value={newTags} onChange={(e) => setNewTags(e.target.value)} className="bg-white/5 border-none rounded-xl text-sm p-3 text-white" />
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedKeyForTag(null)} className="flex-1 bg-white/5 text-white py-2 rounded-xl text-sm font-bold">Cancel</button>
                    <button onClick={handleUpdateTags} className="flex-1 bg-indigo-500 text-white py-2 rounded-xl text-sm font-bold">Save</button>
                  </div>
               </div>
            </div>
        )}
      </main>

      {rotationWarningKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl text-center">
             <div className="w-20 h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-8"><AlertTriangle size={40} /></div>
             <h3 className="text-3xl font-bold mb-4">Credentials Updated</h3>
             <p className="text-neutral-400 mb-8">The API key for "{rotationWarningKey.name}" has been rotated. Update your secrets.</p>
             <button onClick={() => setRotationWarningKey(null)} className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-neutral-200">I've updated my credentials</button>
           </div>
        </div>
      )}

      {selectedLogsKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
             <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><History size={24} /></div>
                   <h3 className="text-2xl font-bold">Request Logs</h3>
                </div>
                <button onClick={() => setSelectedLogsKey(null)} className="p-2 hover:bg-white/5 rounded-xl text-neutral-600 hover:text-white"><X size={24} /></button>
             </div>
             <div className="flex-1 overflow-auto p-8 space-y-12">
                <div className="space-y-4">
                   <h4 className="text-sm font-bold text-neutral-400 uppercase">Hourly Pattern (7 Days)</h4>
                   <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-6">
                      <HourlyHeatmap apiKeyId={selectedLogsKey.id} />
                   </div>
                </div>
                <div className="space-y-4">
                   <h4 className="text-sm font-bold text-neutral-400 uppercase">Recent Requests</h4>
                   {loadingLogs ? (
                      <div className="h-64 flex items-center justify-center"><RefreshCw className="animate-spin text-emerald-500" /></div>
                   ) : (
                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                         <table className="w-full text-left text-sm font-mono">
                            <thead className="bg-white/[0.03] border-b border-white/5">
                               <tr>
                                  <th className="px-6 py-4 text-neutral-500 uppercase text-[10px]">Method</th>
                                  <th className="px-6 py-4 text-neutral-500 uppercase text-[10px]">Path</th>
                                  <th className="px-6 py-4 text-neutral-500 uppercase text-[10px]">Status</th>
                                  <th className="px-6 py-4 text-neutral-500 uppercase text-[10px] text-right">Time</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-neutral-400">
                               {logs.map((log) => (
                                  <tr key={log.id}>
                                     <td className="px-6 py-4"><span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px]">{log.method}</span></td>
                                     <td className="px-6 py-4 truncate max-w-xs">{log.path}</td>
                                     <td className="px-6 py-4"><span className={log.status_code >= 400 ? 'text-rose-500' : 'text-emerald-500'}>{log.status_code}</span></td>
                                     <td className="px-6 py-4 text-right text-[11px]">{new Date(log.created_at).toLocaleString()}</td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      </div>
                   )}
                </div>
             </div>
           </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-8 right-8 bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[300]">
          <p>{toast.message}</p>
          <button onClick={() => navigator.clipboard.writeText(toast.key || "")} className="bg-black/20 px-3 py-1 rounded-lg text-xs font-bold">Copy New</button>
          <button onClick={() => setToast(null)} className="text-white/70">X</button>
        </div>
      )}
      <footer className="p-12 border-t border-white/5 bg-[#030303] text-center">
        <p className="text-xs font-bold text-neutral-700 uppercase tracking-[0.4em]">
          © 2026 Ner-Data-Base · Locally Powered by ZimaOS
        </p>
      </footer>
    </div>
  );
}
