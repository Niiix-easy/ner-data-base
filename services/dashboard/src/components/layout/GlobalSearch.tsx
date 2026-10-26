"use client";
import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export const GlobalSearch = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchData = async () => {
      const [keysRes, tablesRes] = await Promise.all([
        fetch("/api/control-plane/api-keys").then(r => r.json()),
        fetch("/api/control-plane/db/tables").then(r => r.json())
      ]);

      const filtered = [
        ...keysRes.filter((k: any) => k.name.toLowerCase().includes(query.toLowerCase())).map((k: any) => ({ type: 'Key', name: k.name, href: '/api-keys' })),
        ...tablesRes.tables.filter((t: any) => t.table_name.toLowerCase().includes(query.toLowerCase())).map((t: any) => ({ type: 'Table', name: t.table_name, href: `/editor/${t.table_schema}/${t.table_name}` }))
      ];
      setResults(filtered.slice(0, 5));
    };

    fetchData();
  }, [query]);

  return (
    <div className="relative w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
      <input 
        type="text" 
        placeholder="Search..." 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all w-full text-white"
      />
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl z-[600] overflow-hidden">
            {results.map((r, i) => (
                <button key={i} onClick={() => { router.push(r.href); setQuery(""); }} className="w-full text-left px-4 py-2 hover:bg-white/5 text-xs text-neutral-300">
                    <span className="text-emerald-500 font-bold">{r.type}:</span> {r.name}
                </button>
            ))}
        </div>
      )}
    </div>
  );
};
