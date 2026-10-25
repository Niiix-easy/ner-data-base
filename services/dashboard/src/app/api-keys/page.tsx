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
  AlertCircle,
  RefreshCw,
  Activity,
  X,
  History,
  AlertTriangle
} from "lucide-react";

interface ApiKey {
  id: number;
  name: string;
  key_value: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  usage_count: number;
}

interface UsageLog {
  id: number;
  method: string;
  path: string;
  status_code: number;
  ip_address: string;
  created_at: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [expirationDays, setExpirationDays] = useState("0"); // "0" means Never
  const [showKeyId, setShowKeyId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Rotation modal state
  const [rotationWarningKey, setRotationWarningKey] = useState<ApiKey | null>(null);
  
  // Logs modal state
  const [selectedLogsKey, setSelectedLogsKey] = useState<ApiKey | null>(null);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [expiringSoonCount, setExpiringSoonCount] = useState(0);

  useEffect(() => {
    fetchKeys();
  }, []);

  useEffect(() => {
    // Check for keys expiring soon (within 3 days)
    const soon = 3 * 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const count = keys.filter(k => 
      k.expires_at && 
      !k.revoked_at && 
      (new Date(k.expires_at).getTime() - now) > 0 &&
      (new Date(k.expires_at).getTime() - now) < soon
    ).length;
    
    setExpiringSoonCount(count);
    
    if (count > 0 && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification("Aviso de Expiração", {
          body: `Você tem ${count} chave(s) API expirando em breve!`,
          icon: "/favicon.ico"
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, [keys]);

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
      let expiresAt = null;
      if (expirationDays !== "0") {
        const date = new Date();
        date.setDate(date.getDate() + parseInt(expirationDays));
        expiresAt = date.toISOString();
      }

      const res = await fetch("/api/control-plane/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newKeyName,
          expiresAt: expiresAt
        }),
      });
      if (!res.ok) throw new Error("Failed to generate API key");
      const newKey = await res.json();
      setKeys([newKey, ...keys]);
      setNewKeyName("");
      setExpirationDays("0");
      setShowKeyId(newKey.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRotate = async (id: number) => {
    try {
      const res = await fetch(`/api/control-plane/api-keys/${id}/rotate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to rotate API key");
      const updatedKey = await res.json();
      
      setKeys(keys.map(k => k.id === id ? { ...updatedKey, usage_count: k.usage_count } : k));
      setShowKeyId(id);
      setRotationWarningKey(updatedKey);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchLogs = async (key: ApiKey) => {
    setSelectedLogsKey(key);
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/control-plane/api-keys/${key.id}/logs`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingLogs(false);
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
    <div className="flex flex-col min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30 relative">
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
        {expiringSoonCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Atenção: Chaves Expirando</p>
              <p className="text-xs text-neutral-400">Você tem {expiringSoonCount} chave(s) que expiram nos próximos 3 dias. Considere rotacioná-las.</p>
            </div>
            <button 
              onClick={() => setExpiringSoonCount(0)}
              className="p-2 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">API Keys</h1>
            <p className="text-neutral-500 font-medium max-w-2xl">
              Gerencie chaves de acesso para seu projeto. Use estas chaves para autenticar solicitações à API do Ner-Data-Base.
            </p>
          </div>
          
          <form onSubmit={handleGenerate} className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-[#0a0a0a] border border-white/5 p-2 rounded-2xl shadow-xl">
             <input 
              type="text" 
              placeholder="Nome da chave (ex: Mobile App)" 
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm px-4 py-2 w-full md:w-64 text-white placeholder:text-neutral-700"
              required
             />
             <div className="h-4 w-px bg-white/5 hidden md:block"></div>
             <select 
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-xs px-4 py-2 text-neutral-400 font-bold uppercase tracking-widest cursor-pointer"
             >
               <option value="0" className="bg-[#0a0a0a]">Never Expires</option>
               <option value="1" className="bg-[#0a0a0a]">24 Hours</option>
               <option value="7" className="bg-[#0a0a0a]">7 Days</option>
               <option value="30" className="bg-[#0a0a0a]">30 Days</option>
               <option value="60" className="bg-[#0a0a0a]">60 Days</option>
               <option value="90" className="bg-[#0a0a0a]">90 Days</option>
             </select>
             <button 
              type="submit" 
              disabled={generating || !newKeyName.trim()}
              className="flex items-center justify-center gap-2 bg-white text-black px-6 py-2 rounded-xl text-xs font-bold transition-all hover:bg-neutral-200 disabled:opacity-50"
             >
               {generating ? "Gerando..." : <><Plus size={14} /> Criar Chave</>}
             </button>
          </form>
        </div>

        {/* Keys List */}
        <section className="space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Sua Lista de Chaves</h2>
              <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                 <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                   Active
                 </div>
                 <div className="flex items-center gap-1.5 text-neutral-700">
                   <span className="w-2 h-2 rounded-full bg-neutral-800"></span>
                   Revoked
                 </div>
              </div>
           </div>
           
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
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {keys.map((key) => (
                  <div 
                    key={key.id} 
                    className={`bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 transition-all hover:border-white/10 relative overflow-hidden group ${key.revoked_at ? 'opacity-40 grayscale' : ''}`}
                  >
                    <div className="absolute top-8 right-8 flex items-center gap-2">
                      {!key.revoked_at && (
                        <>
                          <button 
                            onClick={() => handleRotate(key.id)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-neutral-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                            title="Rotate Key"
                          >
                            <RefreshCw size={14} className="group-hover/btn:rotate-180 transition-transform duration-500" />
                            Rotate
                          </button>
                          <button 
                            onClick={() => handleRevoke(key.id)}
                            className="p-2.5 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-neutral-600 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100" 
                            title="Revoke Key"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      {key.revoked_at && (
                        <span className="px-3 py-1.5 bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-rose-500/20">Revoked</span>
                      )}
                    </div>

                    <div className="flex flex-col gap-8">
                       <div className="space-y-4 flex-1">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${key.revoked_at ? 'text-neutral-700' : 'text-indigo-400'}`}>
                               <Database size={20} />
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center gap-3">
                                 <h3 className="text-xl font-bold tracking-tight text-white">{key.name}</h3>
                                 {!key.revoked_at && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>}
                               </div>
                               <div className="flex items-center gap-4 mt-1">
                                  <p className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                     <Clock size={10} />
                                     Created {new Date(key.created_at).toLocaleDateString()}
                                  </p>
                                  {key.expires_at ? (
                                     <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${new Date(key.expires_at) < new Date() ? 'text-rose-500' : 'text-amber-500/80'}`}>
                                        <Clock size={10} />
                                        {new Date(key.expires_at) < new Date() ? 'Expired' : `Expires ${new Date(key.expires_at).toLocaleDateString()}`}
                                     </p>
                                  ) : (
                                     <p className="text-[10px] text-neutral-700 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <ShieldCheck size={10} />
                                        Never Expires
                                     </p>
                                  )}
                                  <button 
                                    onClick={() => fetchLogs(key)}
                                    className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
                                  >
                                     <Activity size={10} />
                                     {key.usage_count} Requests
                                  </button>
                               </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 max-w-full">
                             <div className="flex-1 bg-[#060606] border border-white/5 rounded-xl px-5 py-4 font-mono text-sm text-neutral-400 overflow-hidden text-ellipsis whitespace-nowrap shadow-inner">
                                {showKeyId === key.id ? key.key_value : maskKey(key.key_value)}
                             </div>
                             {!key.revoked_at && (
                               <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)}
                                    className="p-4 hover:bg-white/5 rounded-2xl text-neutral-500 hover:text-white transition-colors"
                                    title={showKeyId === key.id ? "Hide Key" : "Show Key"}
                                  >
                                    {showKeyId === key.id ? <EyeOff size={20} /> : <Eye size={20} />}
                                  </button>
                                  <button 
                                    onClick={() => copyToClipboard(key.key_value, key.id)}
                                    className={`p-4 hover:bg-white/5 rounded-2xl transition-all ${copiedId === key.id ? 'text-emerald-500' : 'text-neutral-500 hover:text-white'}`}
                                    title="Copy to Clipboard"
                                  >
                                    {copiedId === key.id ? <Check size={20} /> : <Copy size={20} />}
                                  </button>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>
                  </div>
                ))}
             </div>
           )}
        </section>
      </main>

      {/* Rotation Warning Modal */}
      {rotationWarningKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
             
             <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mx-auto mb-8">
                <AlertTriangle size={40} />
             </div>
             
             <h3 className="text-3xl font-bold tracking-tight mb-4">Update Your Credentials</h3>
             <p className="text-neutral-400 mb-8 leading-relaxed">
               The API key for <span className="text-white font-bold">"{rotationWarningKey.name}"</span> has been rotated. 
               The old key value is now <span className="text-rose-500 font-bold">invalid</span>. 
               Please update your application secrets immediately with the new key value.
             </p>
             
             <button 
               onClick={() => setRotationWarningKey(null)}
               className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-neutral-200 transition-all active:scale-[0.98]"
             >
               I've updated my credentials
             </button>
           </div>
        </div>
      )}

      {/* Logs Modal */}
      {selectedLogsKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[200] p-6">
           <div className="bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
             <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <History size={24} />
                   </div>
                   <div>
                      <h3 className="text-2xl font-bold tracking-tight">Request Logs</h3>
                      <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Key: {selectedLogsKey.name}</p>
                   </div>
                </div>
                <button onClick={() => setSelectedLogsKey(null)} className="p-2 hover:bg-white/5 rounded-xl text-neutral-600 hover:text-white transition-colors">
                   <X size={24} />
                </button>
             </div>

             <div className="flex-1 overflow-auto p-8">
                {loadingLogs ? (
                   <div className="h-64 flex flex-col items-center justify-center space-y-4 opacity-50">
                      <RefreshCw size={32} className="animate-spin text-emerald-500" />
                      <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">Fetching logs...</p>
                   </div>
                ) : logs.length === 0 ? (
                   <div className="h-64 flex flex-col items-center justify-center space-y-6 opacity-30">
                      <History size={48} className="text-neutral-600" />
                      <p className="text-sm font-bold uppercase tracking-[0.2em] text-neutral-500">No requests recorded</p>
                   </div>
                ) : (
                   <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                      <table className="w-full text-left text-sm font-mono tabular-nums">
                         <thead className="bg-white/[0.03] border-b border-white/5">
                            <tr>
                               <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Method</th>
                               <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Path</th>
                               <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Status</th>
                               <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">IP Address</th>
                               <th className="px-6 py-4 font-bold text-neutral-500 uppercase tracking-widest text-[10px] text-right">Timestamp</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5 text-neutral-400">
                            {logs.map((log) => (
                               <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-6 py-4">
                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.method === 'GET' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {log.method}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 truncate max-w-xs">{log.path}</td>
                                  <td className="px-6 py-4">
                                     <span className={log.status_code >= 400 ? 'text-rose-500' : 'text-emerald-500'}>{log.status_code}</span>
                                  </td>
                                  <td className="px-6 py-4">{log.ip_address}</td>
                                  <td className="px-6 py-4 text-right text-[11px]">{new Date(log.created_at).toLocaleString()}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                )}
             </div>

             <div className="p-8 bg-white/[0.01] border-t border-white/5 text-center">
                <p className="text-[10px] font-bold text-neutral-700 uppercase tracking-widest">Displaying last 50 requests</p>
             </div>
           </div>
        </div>
      )}

      <footer className="p-12 border-t border-white/5 bg-[#030303] text-center mt-auto">
        <p className="text-xs font-bold text-neutral-700 uppercase tracking-[0.4em]">
          © 2026 Neer-Data-Base · Locally Managed Keys
        </p>
      </footer>
    </div>
  );
}
