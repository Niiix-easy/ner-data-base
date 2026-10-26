"use client";
import React, { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

export const NotificationCenter = () => {
  const [toasts, setToasts] = useState<any[]>([]);

  const [highUsageStart, setHighUsageStart] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [metricsRes, alertsRes] = await Promise.all([
            fetch("/api/control-plane/system/metrics"),
            fetch("/api/control-plane/api-keys/alerts-recent")
        ]);
        
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
  }, [highUsageStart]);

  const addToast = (message: string, type: "error" | "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 5000);
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-8 z-[500] space-y-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="bg-rose-500 text-white p-4 rounded-xl shadow-2xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p className="text-sm font-bold">{toast.message}</p>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-white/70">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
