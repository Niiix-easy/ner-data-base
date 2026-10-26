"use client";

import React, { useEffect, useState } from "react";
import { Database, Archive, Activity, Layers } from "lucide-react";

interface UsageMetrics {
  database_rows: number;
  api_requests: number;
  storage_bytes: number;
  buckets_count: number;
  tables_count: number;
}

export function ProjectUsageMetrics() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/control-plane/project/usage-metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        console.error("Failed to fetch usage metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-[2rem] animate-pulse"></div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Database Usage",
      value: metrics ? `${metrics.database_rows.toLocaleString()} rows` : "0 rows",
      subValue: metrics ? `${metrics.tables_count} tables` : "0 tables",
      icon: Database,
      color: "text-indigo-400",
      bg: "bg-indigo-400/10",
    },
    {
      label: "Storage Consumed",
      value: metrics ? formatBytes(metrics.storage_bytes) : "0 Bytes",
      subValue: metrics ? `${metrics.buckets_count} buckets` : "0 buckets",
      icon: Archive,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "API Activity",
      value: metrics ? `${metrics.api_requests.toLocaleString()} calls` : "0 calls",
      subValue: "Total requests logged",
      icon: Activity,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {items.map((item, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 hover:border-white/10 transition-all shadow-xl group">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-2xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
              <item.icon size={20} />
            </div>
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{item.label}</p>
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-white mb-1">{item.value}</h3>
            <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">{item.subValue}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
