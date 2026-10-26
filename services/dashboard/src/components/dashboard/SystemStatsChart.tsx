"use client";

import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
}

export const SystemStatsChart = () => {
  const [data, setData] = useState<MetricPoint[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/control-plane/system/metrics');
        if (!res.ok) throw new Error('Failed to fetch metrics');
        const newData = await res.json();
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setData(prev => {
          const updated = [...prev, { time: timeStr, cpu: newData.cpu, memory: newData.memory }];
          return updated.slice(-20); // Keep last 20 points
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Update every 3s
    return () => clearInterval(interval);
  }, []);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'system-stats.json';
    a.click();
  };

  return (
    <div className="h-64 w-full mt-6 bg-[#0f0f0f] border border-neutral-800 rounded-xl p-4 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Carga do Sistema (Real-time)</h3>
        <div className="flex gap-4 items-center">
            <button onClick={downloadJson} className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 border border-white/5 px-2 py-1 rounded-lg">
                <Download size={10} /> JSON
            </button>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-neutral-300 text-xs">CPU</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-neutral-300 text-xs">Memória</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#525252" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            minTickGap={30}
          />
          <YAxis 
            stroke="#525252" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            domain={[0, 100]}
            tickFormatter={(val) => `${val}%`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px', fontSize: '12px' }}
            itemStyle={{ padding: '2px 0' }}
          />
          <Area 
            type="monotone" 
            dataKey="cpu" 
            stroke="#6366f1" 
            fillOpacity={1} 
            fill="url(#colorCpu)" 
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area 
            type="monotone" 
            dataKey="memory" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorMem)" 
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
