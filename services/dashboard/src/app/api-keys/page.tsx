"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Key, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ArrowLeft,
  ChevronRight,
  Database,
  ShieldCheck,
  Clock,
  MoreHorizontal,
  AlertCircle
} from "lucide-react";

interface ApiKey {
  id: number;
  name: string;
  key_value: string;
  created_at: string;
  revoked_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [showKeyId, setShowKeyId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/control-plane/api-keys");
      if (!res.ok) throw new Error("Failed to fetch API keys");
      const data = await res.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/control-plane/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      if (!res.ok) throw new Error("Failed to generate API key");
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
      setNewKeyName("");
      // Show the newly created key immediately
      setShowKeyId(newKey.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Are you sure you want to revoke this API key? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/control-plane/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to revoke API key");
      
      setKeys(keys.map(k => k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (key: string) => {
    const prefix = key.substring(0, 5);
    const suffix = key.substring(key.length - 4);
    return `${prefix}${"*".repeat(key.length - 9)}${suffix}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white" title="Back to Dashboard">
            <ArrowLeft size={16} />
          </Link>
          <div className="h-4 w-px bg-white/5 mx-2"></div>
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <span>Projects</span>
            <span className="text-neutral-700">/</span>
            <span className="text-white font-bold">API Keys</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto p-8 lg:p-12 space-y-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">API Keys</h1>
            <p className="text-neutral-500 font-medium max-w-2xl">
              Gerencie chaves de acesso para seu projeto. Use estas chaves para autenticar solicitações à API do Neer-Data-Base a partir de sua aplicação.
            </p>
          </div>
          
          <form onSubmit={handleGenerate} className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 p-2 rounded-2xl shadow-xl">
             <input 
              type="text" 
              placeholder="Nome da chave (ex: Mobile App)" 
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-64 text-white placeholder:text-neutral-700"
              required
             />
             <button 
              type="submit" 
              disabled={generating || !newKeyName.trim()}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-xs font-bold transition-all hover:bg-neutral-200 disabled:opacity-50"
             >
               {generating ? "Gerando..." : <><Plus size={14} /> Criar Chave</>}
             </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 flex items-start gap-6">
           <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
             <ShieldCheck size={24} />
           </div>
           <div className="space-y-2">
             <h3 className="text-lg font-bold tracking-tight text-emerald-400">Security Best Practices</h3>
             <p className="text-sm text-emerald-500/80 leading-relaxed">
               Nunca exponha suas chaves de API em ambientes públicos. Use variáveis de ambiente e ferramentas de gerenciamento de segredos. 
               Se uma chave for comprometida, revogue-a imediatamente e gere uma nova.
             </p>
           </div>
        </div>

        {/* Keys List */}
        <section className="space-y-6">
           <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Sua Lista de Chaves</h2>
           
           {loading ? (
             <div className="grid grid-cols-1 gap-4">
                {[1, 2].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />)}
             </div>
           ) : error ? (
             <div className="p-12 text-center bg-rose-500/5 border border-rose-500/10 rounded-[2rem] space-y-4">
                <AlertCircle size={40} className="mx-auto text-rose-500" />
                <p className="text-rose-400 font-medium">{error}</p>
             </div>
           ) : keys.length === 0 ? (
             <div className="p-20 text-center bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] space-y-6 opacity-50">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-600 mx-auto">
                   <Key size={32} />
                </div>
                <div className="space-y-2">
                   <p className="text-lg font-bold tracking-tight">Nenhuma chave gerada ainda</p>
                   <p className="text-sm text-neutral-500">Crie sua primeira chave de API para começar a integrar seus serviços.</p>
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {keys.map((key) => (
                  <div 
                    key={key.id} 
                    className={`bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 transition-all hover:border-white/10 relative overflow-hidden group ${key.revoked_at ? 'opacity-40 grayscale' : ''}`}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-8 right-8 flex items-center gap-3">
                      {key.revoked_at ? (
                        <span className="px-2 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-rose-500/20">Revoked</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-emerald-500/20">Active</span>
                      )}
                      {!key.revoked_at && (
                        <button 
                          onClick={() => handleRevoke(key.id)}
                          className="p-2 hover:bg-rose-500/10 rounded-xl text-neutral-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100" 
                          title="Revoke Key"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                       <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400">
                               <Database size={18} />
                            </div>
                            <div>
                               <h3 className="text-xl font-bold tracking-tight text-white">{key.name}</h3>
                               <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                                  <Clock size={10} />
                                  Created on {new Date(key.created_at).toLocaleDateString()}
                               </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 max-w-full">
                             <div className="flex-1 bg-[#060606] border border-white/5 rounded-xl px-4 py-3 font-mono text-sm text-neutral-400 overflow-hidden text-ellipsis whitespace-nowrap">
                                {showKeyId === key.id ? key.key_value : maskKey(key.key_value)}
                             </div>
                             <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)}
                                  className="p-3 hover:bg-white/5 rounded-xl text-neutral-500 hover:text-white transition-colors"
                                  title={showKeyId === key.id ? "Hide Key" : "Show Key"}
                                >
                                  {showKeyId === key.id ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(key.key_value, key.id)}
                                  className={`p-3 hover:bg-white/5 rounded-xl transition-all ${copiedId === key.id ? 'text-emerald-500' : 'text-neutral-500 hover:text-white'}`}
                                  title="Copy to Clipboard"
                                >
                                  {copiedId === key.id ? <Check size={18} /> : <Copy size={18} />}
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>
                    
                    {/* Background Detail */}
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>
                  </div>
                ))}
             </div>
           )}
        </section>
      </main>

      <footer className="p-12 border-t border-white/5 bg-[#030303] text-center mt-auto">
        <p className="text-xs font-bold text-neutral-700 uppercase tracking-[0.4em]">
          © 2026 Neer-Data-Base · Locally Managed Keys
        </p>
      </footer>
    </div>
  );
}
