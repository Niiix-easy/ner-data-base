"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { SystemStatsChart } from "@/components/dashboard/SystemStatsChart";
import { ApiKeyUsageChart } from "@/components/dashboard/ApiKeyUsageChart";
import { 
  Database, 
  Globe, 
  Cpu, 
  ShieldCheck, 
  ArrowUpRight, 
  Layers, 
  Zap, 
  Table, 
  Archive,
  RefreshCw,
  Pause,
  Play,
  Download,
  Search,
  Plus,
  Settings,
  MoreHorizontal
} from "lucide-react";

export default function Home() {
  const { t } = useI18n();
  const [migrationStatus, setMigrationStatus] = useState<{
    loading: boolean;
    message: string;
    type: "success" | "error" | "info" | null;
  }>({
    loading: false,
    message: "",
    type: null,
  });

  const [projectState, setProjectState] = useState<"active" | "paused">("active");

  const handlePauseResume = async () => {
    const action = projectState === "paused" ? "resume" : "pause";
    setMigrationStatus({ loading: true, message: `${action === "resume" ? "Resuming" : "Pausing"} project...`, type: "info" });
    try {
      const res = await fetch(`/api/control-plane/project/${action}`, { method: "POST" });
      if (res.ok) {
        setProjectState(action === "resume" ? "active" : "paused");
        setMigrationStatus({ loading: false, message: `Project ${action}d successfully.`, type: "success" });
      } else {
        setMigrationStatus({ loading: false, message: `Failed to ${action} project.`, type: "error" });
      }
    } catch (e) {
      setMigrationStatus({ loading: false, message: "Error communicating with server.", type: "error" });
    }
  };

  const handleBackup = async () => {
    setMigrationStatus({ loading: true, message: "Generating backup...", type: "info" });
    try {
      const res = await fetch("/api/control-plane/project/backup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMigrationStatus({ loading: false, message: `Backup ready: ${data.message}`, type: "success" });
      } else {
        setMigrationStatus({ loading: false, message: "Failed to generate backup.", type: "error" });
      }
    } catch (e) {
      setMigrationStatus({ loading: false, message: "Error communicating with server.", type: "error" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30">
      {/* Top Navigation Bar (Supabase Style) */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">Projects</Link>
            <span className="text-neutral-700">/</span>
            <span className="text-white font-bold">Default Project</span>
          </div>
          <div className="h-4 w-px bg-white/5 mx-2"></div>
          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Search resource..." 
              className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all w-64"
            />
          </div>
          <button className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-500 hover:text-white transition-colors">
            <Settings size={18} />
          </button>
          <div className="h-4 w-px bg-white/5"></div>
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
            <Plus size={14} />
            New Resource
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-12">
        {/* Page Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter">Dashboard</h1>
            <p className="text-neutral-500 font-medium">Gerencie sua infraestrutura local ZimaOS.</p>
          </div>
          <div className="flex gap-3">
             <button 
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-sm font-bold transition-all"
             >
               {projectState === "active" ? <Pause size={16} /> : <Play size={16} />}
               {projectState === "active" ? "Pause Project" : "Resume Project"}
             </button>
             <button 
              onClick={handleBackup}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl hover:bg-neutral-200 text-sm font-bold transition-all shadow-xl shadow-white/5"
             >
               <Download size={16} />
               Backup Now
             </button>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">System Performance</h2>
            <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Nominal
              </div>
              <span>Updated every 3s</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
             <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                <SystemStatsChart />
             </div>
             <div className="lg:col-span-2 bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
                <ApiKeyUsageChart />
             </div>
          </div>
        </section>

        {/* Services Health */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-[0.2em]">Infrastructure Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'PostgreSQL', status: 'Healthy', version: 'v15.4', icon: Database, color: 'text-indigo-400' },
              { label: 'Kong Gateway', status: 'Healthy', version: 'v3.4.1', icon: Globe, color: 'text-emerald-400' },
              { label: 'Edge Runtime', status: 'Healthy', version: 'Deno v1.37', icon: Zap, color: 'text-amber-400' },
              { label: 'Auth Engine', status: 'Healthy', version: 'v2.1.0', icon: ShieldCheck, color: 'text-rose-400' },
            ].map((service, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 hover:border-white/10 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 ${service.color}`}>
                    <service.icon size={20} />
                  </div>
                  <button className="text-neutral-700 hover:text-white transition-colors">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
                <div className="relative z-10">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">{service.label}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-bold tracking-tight">{service.version}</p>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                      {service.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Database Quick Actions */}
        <section className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-4xl font-bold tracking-tighter">Pronto para manipular seus dados?</h2>
            <p className="text-neutral-400 text-lg leading-relaxed max-w-xl">
              Acesse o editor SQL para realizar consultas complexas ou gerencie seus buckets de armazenamento com nossa interface visual intuitiva.
            </p>
            <div className="flex flex-wrap gap-4">
               <Link href="/sql-editor" className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-all flex items-center gap-2 group">
                 Open SQL Editor
                 <ArrowUpRight size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
               </Link>
               <Link href="/storage" className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                 Browse Storage
               </Link>
            </div>
          </div>
          <div className="w-full lg:w-1/3 grid grid-cols-1 gap-4">
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Table size={18} className="text-indigo-400" />
                  <span className="text-sm font-bold">Tabelas do Banco</span>
                </div>
                <p className="text-xs text-neutral-500">12 tabelas criadas · 1.2GB de dados</p>
             </div>
             <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <Archive size={18} className="text-emerald-400" />
                  <span className="text-sm font-bold">Objetos no Storage</span>
                </div>
                <p className="text-xs text-neutral-500">4 buckets ativos · 8.4GB armazenados</p>
             </div>
          </div>
        </section>
      </main>

      <footer className="p-12 border-t border-white/5 bg-[#030303] text-center">
        <p className="text-xs font-bold text-neutral-700 uppercase tracking-[0.4em]">
          © 2026 Ner-Data-Base · Locally Powered by ZimaOS
        </p>
      </footer>
    </div>
  );
}

