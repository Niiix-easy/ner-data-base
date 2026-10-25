"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Play, 
  Terminal, 
  History, 
  Save, 
  Trash2, 
  Download, 
  Search, 
  ArrowLeft,
  ChevronRight,
  Database,
  RefreshCw,
  Code2
} from "lucide-react";

export default function SqlEditorPage() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/control-plane/db/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Failed to execute query");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#030303] text-white font-sans overflow-hidden">
      {/* Header Toolbar */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
          <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white" title="Back to Dashboard">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-4 w-px bg-white/5"></div>
          <Database size={14} />
          <span className="hover:text-white transition-colors cursor-pointer">Postgres</span>
          <ChevronRight size={12} className="text-neutral-700" />
          <span className="text-white font-bold">SQL Editor</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-500 hover:text-white transition-all text-xs font-bold hover:bg-white/5">
            <History size={14} />
            History
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-neutral-500 hover:text-white transition-all text-xs font-bold hover:bg-white/5">
            <Save size={14} />
            Save Snippet
          </button>
          <div className="h-4 w-px bg-white/5 mx-1"></div>
          <button
            onClick={handleExecute}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
          >
            <Play size={14} fill="currentColor" />
            {loading ? "Running..." : "Run Query"}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-h-[300px] border-b border-white/5 bg-[#060606]">
          <div className="flex items-center gap-2 px-6 py-2 bg-white/[0.02] border-b border-white/5">
            <Code2 size={12} className="text-neutral-600" />
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Query Console</span>
          </div>
          <textarea
            className="flex-1 w-full bg-transparent p-8 text-sm font-mono text-neutral-300 placeholder:text-neutral-700 focus:outline-none resize-none leading-relaxed"
            spellCheck={false}
            autoFocus
            placeholder="-- Write your SQL query here
SELECT * FROM public.users
LIMIT 10;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          ></textarea>
        </div>

        {/* Results Area */}
        <div className="h-1/3 min-h-[250px] bg-[#030303] flex flex-col relative">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-black/50 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Query Results</h2>
              {result && (
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">
                  {result.rows?.length || 0} rows found
                </span>
              )}
            </div>
            {result && (
              <div className="flex gap-2">
                <button className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors" title="Export CSV">
                  <Download size={14} />
                </button>
                <button onClick={() => setResult(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors" title="Clear Results">
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50 animate-pulse">
                <RefreshCw size={24} className="animate-spin text-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">Executing Query...</p>
              </div>
            ) : error ? (
              <div className="p-6 rounded-[2rem] bg-rose-500/5 border border-rose-500/10 text-rose-400 font-mono text-xs leading-relaxed max-w-4xl">
                <div className="flex items-center gap-2 mb-4 font-bold text-rose-500 uppercase tracking-widest">
                  <Trash2 size={14} />
                  Execution Error
                </div>
                {error}
              </div>
            ) : result && result.rows && result.rows.length > 0 ? (
              <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left font-mono text-[13px] tabular-nums border-collapse">
                  <thead className="bg-white/[0.03] border-b border-white/5">
                    <tr>
                      {result.fields.map((field: any) => (
                        <th key={field.name} className="px-6 py-3 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">
                          {field.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {result.rows.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        {result.fields.map((field: any) => (
                          <td key={field.name} className="px-6 py-3 text-neutral-300">
                            {row[field.name] !== null ? String(row[field.name]) : <span className="text-neutral-700 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : result ? (
              <div className="h-full flex items-center justify-center">
                 <p className="text-neutral-500 font-medium italic text-sm">Query executed successfully. No rows returned.</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-30">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600">
                  <Terminal size={32} />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">Awaiting Query Execution</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
