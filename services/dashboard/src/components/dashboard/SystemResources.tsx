"use client";

import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Cpu, Layers } from "lucide-react";

export function SystemResources({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [alertVisible, setAlertVisible] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch("/api/control-plane/system/metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(prev => {
            const next = [...prev.slice(-99), data];
            if (next.length >= 100) {
                const critical = next.slice(-100).every(m => m.cpu > 90 || m.memory > 90);
                setAlertVisible(critical);
            }
            return next;
          });
        }
      } catch (err) {
        console.error("Failed to fetch system metrics:", err);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  if (variant === 'compact') {
      return (
        <div className="flex items-center gap-4 bg-white/5 px-4 py-1.5 rounded-lg border border-white/5 text-xs font-bold">
            {alertVisible && <span className="text-rose-500 animate-pulse">Critical!</span>}
            <div className="flex items-center gap-2 text-indigo-400">
                <Cpu size={14} /> CPU: {metrics.length > 0 ? metrics[metrics.length - 1].cpu.toFixed(0) : 0}%
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
                <Layers size={14} /> MEM: {metrics.length > 0 ? metrics[metrics.length - 1].memory.toFixed(0) : 0}%
            </div>
        </div>
      );
  }

  return (
    <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 h-40 relative">
      {alertVisible && (
          <div className="absolute top-4 right-4 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase p-2 rounded-lg animate-pulse border border-rose-500/20">
              Critical Usage
          </div>
      )}
      <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">System Resources (Real-time)</h3>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={metrics}>
          <XAxis dataKey="timestamp" hide />
          <YAxis hide domain={[0, 100]} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px' }}
          />
          <Area type="monotone" dataKey="cpu" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="CPU %" />
          <Area type="monotone" dataKey="memory" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Mem %" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
