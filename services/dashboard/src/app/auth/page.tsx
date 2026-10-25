'use client'

import React from 'react';
import Link from 'next/link';
import { Users, UserPlus, Shield, Key, ArrowLeft, Search, MoreHorizontal, Mail, ShieldCheck } from 'lucide-react';

export default function AuthPage() {
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
            <span className="text-white font-bold">Authentication</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              placeholder="Search users..." 
              className="bg-white/5 border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-xs focus:outline-none w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]">
            <UserPlus size={14} />
            Invite User
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-8 lg:p-12 space-y-12">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter">Authentication</h1>
          <p className="text-neutral-500 font-medium">Manage users, roles, and security policies for your application.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 space-y-2">
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Total Users</p>
              <p className="text-4xl font-bold tracking-tighter">1,284</p>
           </div>
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 space-y-2">
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Active Sessions</p>
              <p className="text-4xl font-bold tracking-tighter text-emerald-500">84</p>
           </div>
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-8 space-y-2">
              <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Security Events</p>
              <p className="text-4xl font-bold tracking-tighter text-amber-500">0</p>
           </div>
        </div>

        {/* Users Table */}
        <section className="space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex gap-4">
                 <button className="text-xs font-bold text-white border-b-2 border-emerald-500 pb-2 px-1">Users</button>
                 <button className="text-xs font-bold text-neutral-500 hover:text-white pb-2 px-1 transition-colors">Policies</button>
                 <button className="text-xs font-bold text-neutral-500 hover:text-white pb-2 px-1 transition-colors">Providers</button>
                 <button className="text-xs font-bold text-neutral-500 hover:text-white pb-2 px-1 transition-colors">Settings</button>
              </div>
           </div>

           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                 <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                       <th className="px-8 py-5 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">User</th>
                       <th className="px-8 py-5 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Providers</th>
                       <th className="px-8 py-5 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Created</th>
                       <th className="px-8 py-5 font-bold text-neutral-500 uppercase tracking-widest text-[10px]">Last Sign In</th>
                       <th className="px-8 py-5 font-bold text-neutral-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5 font-medium">
                    {[
                       { name: 'Admin User', email: 'admin@neer.local', providers: ['Email'], created: 'Oct 24, 2026', lastIn: '2 hours ago' },
                       { name: 'Jane Doe', email: 'jane@example.com', providers: ['GitHub', 'Email'], created: 'Oct 22, 2026', lastIn: 'Yesterday' },
                       { name: 'John Smith', email: 'john@smith.io', providers: ['Email'], created: 'Oct 15, 2026', lastIn: '5 days ago' },
                    ].map((user, i) => (
                       <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 font-bold">
                                   {user.name[0]}
                                </div>
                                <div>
                                   <p className="font-bold text-white">{user.name}</p>
                                   <p className="text-xs text-neutral-500">{user.email}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-neutral-400">
                             <div className="flex gap-2">
                                {user.providers.map(p => (
                                   <span key={p} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider">{p}</span>
                                ))}
                             </div>
                          </td>
                          <td className="px-8 py-6 text-neutral-500 text-xs">{user.created}</td>
                          <td className="px-8 py-6 text-neutral-500 text-xs">{user.lastIn}</td>
                          <td className="px-8 py-6 text-right">
                             <button className="p-2 hover:bg-white/5 rounded-xl text-neutral-700 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <MoreHorizontal size={18} />
                             </button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
              <div className="p-8 border-t border-white/5 bg-white/[0.01] text-center">
                 <p className="text-xs font-bold text-neutral-600 uppercase tracking-widest">Page 1 of 42</p>
              </div>
           </div>
        </section>

        {/* Security Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                 <Shield size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Policies & RBAC</h2>
              <p className="text-neutral-500 leading-relaxed">Defina regras granulares de acesso a dados usando Row Level Security diretamente no seu banco de dados Postgres.</p>
              <button className="text-xs font-bold text-white uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors">Configure Policies &rarr;</button>
           </div>
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                 <Key size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Auth Providers</h2>
              <p className="text-neutral-500 leading-relaxed">Habilite logins via Google, GitHub, Magic Links e mais. Configure o tempo de vida do JWT e tokens de atualização.</p>
              <button className="text-xs font-bold text-white uppercase tracking-[0.2em] hover:text-emerald-500 transition-colors">Manage Providers &rarr;</button>
           </div>
        </div>
      </main>

      <footer className="p-12 border-t border-white/5 bg-[#030303] text-center mt-auto">
        <p className="text-xs font-bold text-neutral-700 uppercase tracking-[0.4em]">
          © 2026 Neer-Data-Base · Secured by Local Infrastructure
        </p>
      </footer>
    </div>
  );
}
