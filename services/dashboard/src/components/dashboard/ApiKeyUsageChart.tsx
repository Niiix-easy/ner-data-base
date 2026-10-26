"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download } from 'lucide-react';

export const ApiKeyUsageChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [keys, setKeys] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/control-plane/api-keys/usage-stats');
        if (!res.ok) throw new Error('Failed to fetch usage stats');
        const stats = await res.json();
        
        setData(stats);
        
        // Extract all unique key names from the data
        const uniqueKeys = new Set<string>();
        stats.forEach((day: any) => {
          Object.keys(day).forEach(key => {
            if (key !== 'date') uniqueKeys.add(key);
          });
        });
        setKeys(Array.from(uniqueKeys));
      } catch (err) {
        console.error('Error fetching API key usage stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-64 w-full flex items-center justify-center bg-[#0a0a0a] border border-white/5 rounded-[2rem]">
        <div className="animate-pulse text-neutral-500 font-bold uppercase tracking-widest text-[10px]">Carregando estatísticas...</div>
      </div>
    );
  }

  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api-key-usage.json';
    a.click();
  };

  return (
    <div className="h-full w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Uso de Chaves API (Últimos 30 dias)</h3>
        <button onClick={downloadJson} className="text-[10px] font-bold text-neutral-500 hover:text-white uppercase tracking-widest flex items-center gap-1.5 border border-white/5 px-2 py-1 rounded-lg">
          <Download size={10} /> JSON
        </button>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#525252" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
            <YAxis 
              stroke="#525252" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
              allowDecimals={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
              itemStyle={{ padding: '2px 0' }}
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '20px' }} 
            />
            {keys.map((key, index) => (
              <Bar 
                key={key} 
                dataKey={key} 
                stackId="a" 
                fill={colors[index % colors.length]} 
                radius={index === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} 
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
