"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export const NotificationCenter = () => {
  const [toasts, setToasts] = useState<any[]>([]);
  const [highUsageStart, setHighUsageStart] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  // Safety limits (user-defined or default)
  const [maxDbLatencyMs, setMaxDbLatencyMs] = useState(100);
  const [maxRedisMemoryPercent, setMaxRedisMemoryPercent] = useState(80);

  useEffect(() => {
    setMounted(true);
    const storedDbLat = localStorage.getItem("safety_limit_db_latency");
    const storedRedisMem = localStorage.getItem("safety_limit_redis_memory");
    if (storedDbLat) setMaxDbLatencyMs(parseInt(storedDbLat));
    if (storedRedisMem) setMaxRedisMemoryPercent(parseInt(storedRedisMem));

    const interval = setInterval(async () => {
      try {
        const [metricsRes, alertsRes, healthRes] = await Promise.all([
          fetch("/api/control-plane/system/metrics"),
          fetch("/api/control-plane/api-keys/alerts-recent"),
          fetch("/api/health")
        ]);

        if (healthRes.ok) {
          const health = await healthRes.json();
          
          if (health.dbLatencyMs && health.dbLatencyMs > maxDbLatencyMs) {
            addToast(`DB LATENCY EXCEEDED: ${health.dbLatencyMs}ms (Limit: ${maxDbLatencyMs}ms)`, "error");
          }

          if (health.redisMemoryPercent && health.redisMemoryPercent > maxRedisMemoryPercent) {
            addToast(`REDIS MEMORY HIGH: ${health.redisMemoryPercent}% (${health.redisMemoryMb}MB) (Limit: ${maxRedisMemoryPercent}%)`, "error");
          }
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          if (data.cpu > 90 || data.memory > 90) {
            if (!highUsageStart) {
              setHighUsageStart(Date.now());
            } else if (Date.now() - highUsageStart > 300000) { // 5 minutes
              addToast("CRITICAL: Sustained high resource usage > 90%", "error");
              setHighUsageStart(null);
            }
          } else {
            setHighUsageStart(null);
          }
        }

        if (alertsRes.ok) {
          const alerts = await alertsRes.json();
          alerts.forEach((alert: any) => {
            addToast(`ALERT: ${alert.name} reached ${alert.threshold}% limit`, "error");
          });
        }
      } catch (err) {
        console.error("Failed to fetch status", err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [highUsageStart, maxDbLatencyMs, maxRedisMemoryPercent]);

  const addToast = (message: string, type: "error" | "info") => {
    const id = Date.now();
    setToasts((prev) => {
      if (prev.some(t => t.message === message)) return prev;
      return [...prev, { id, message, type }];
    });
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 6000);
  };

  if (!mounted || toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-8 z-[500] space-y-4 max-w-md">
      {toasts.map((toast) => (
        <div key={toast.id} className="bg-[#0f0f10] border border-rose-500/30 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Health Safety Alert</p>
              <p className="text-sm font-semibold text-neutral-200 mt-0.5">{toast.message}</p>
            </div>
          </div>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
