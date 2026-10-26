import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const TopApiKeysChart = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const fetchStats = () => {
        fetch("/api/control-plane/api-keys/top-rpm")
          .then(res => res.json())
          .then(setData)
          .catch(console.error);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-64 w-full bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-neutral-400 uppercase mb-4">Top 5 Keys by RPM</h4>
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10' }} />
                <Bar dataKey="rpm" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
