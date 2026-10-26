import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const WebhookSuccessChart = () => {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetch("/api/control-plane/api-keys/webhooks/hourly-stats")
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div className="h-64 w-full bg-[#0a0a0a] border border-white/5 rounded-3xl p-6">
        <h4 className="text-sm font-bold text-neutral-400 uppercase mb-4">Webhook Success Rate (Last 24h)</h4>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <XAxis dataKey="hour" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10' }} />
                <Area type="monotone" dataKey="success_rate" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
};
