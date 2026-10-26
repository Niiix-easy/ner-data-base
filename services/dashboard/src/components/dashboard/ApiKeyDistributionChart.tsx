"use client";
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

export const ApiKeyDistributionChart = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch("/api/control-plane/api-keys/requests-distribution-24h")
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="h-64 w-full bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-neutral-400 uppercase mb-4">Request Distribution (24h)</h4>
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie data={data} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10' }} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    </div>
  );
};
