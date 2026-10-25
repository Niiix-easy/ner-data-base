"use client";

import React from 'react';
import Link from 'next/link';
import { Database, ShieldCheck, Server, Zap, Globe, Lock, ArrowRight, Play } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

export default function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#060606] text-white font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto gap-8">
          <div className="flex items-center gap-8">
             <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tighter hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-black text-xs">N</div>
              Ner-Data-Base
            </Link>
            <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-400">
              <Link href="#" className="hover:text-white transition-colors">Product</Link>
              <Link href="#" className="hover:text-white transition-colors">Developers</Link>
              <Link href="#" className="hover:text-white transition-colors">Solutions</Link>
              <Link href="#" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-white transition-colors">Docs</Link>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link 
              href="/dashboard" 
              className="px-4 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Start your project
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-8 max-w-7xl mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/10 blur-[120px] rounded-full -z-10 opacity-50"></div>
        
        <div className="text-center space-y-8 max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-neutral-400 uppercase tracking-widest animate-in fade-in slide-in-from-top-4">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Agora em Beta Local
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] text-white">
            Build in a weekend.<br />
            <span className="text-neutral-500 italic font-medium">Scale to millions.</span>
          </h1>
          
          <p className="text-xl text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Neer-Data-Base provides all the backend features you need to build a product: 
            Postgres, Auth, Edge Functions, and Realtime. All running locally on your ZimaOS.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/dashboard" 
              className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 group shadow-lg shadow-emerald-900/20"
            >
              Start your project
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#" 
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all flex items-center gap-2"
            >
              <Play size={18} />
              See how it works
            </Link>
          </div>
        </div>

        {/* Hero Banner Image */}
        <div className="relative group max-w-6xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
          <div className="relative bg-[#0a0a0a] rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
            <img 
              src="/assets/aistudio/Ner-Data-Base__Sua_Infraestrutura_Local_a0ec14ce.png" 
              alt="Ner-Data-Base Infrastructure" 
              className="w-full object-cover opacity-100"
            />
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="px-8 py-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { 
              icon: Database, 
              title: 'PostgreSQL Database', 
              desc: 'Full Postgres database with absolute control. Includes pgvector for AI workloads.',
              color: 'text-indigo-400',
              bg: 'bg-indigo-400/5'
            },
            { 
              icon: Lock, 
              title: 'Authentication', 
              desc: 'Ready-to-use user management. Social logins and Row Level Security built-in.',
              color: 'text-emerald-400',
              bg: 'bg-emerald-400/5'
            },
            { 
              icon: Zap, 
              title: 'Edge Functions', 
              desc: 'Deploy custom logic in seconds. Serverless functions powered by Deno runtime.',
              color: 'text-amber-400',
              bg: 'bg-amber-400/5'
            },
            { 
              icon: Globe, 
              title: 'Realtime', 
              desc: 'Listen to database changes in real-time. Build collaborative apps with ease.',
              color: 'text-rose-400',
              bg: 'bg-rose-400/5'
            },
            { 
              icon: Server, 
              title: 'Storage', 
              desc: 'S3-compatible object storage. Manage huge files with simple API calls.',
              color: 'text-cyan-400',
              bg: 'bg-cyan-400/5'
            },
            { 
              icon: ShieldCheck, 
              title: 'Self-Hosted Privacy', 
              desc: 'Run everything locally on your ZimaOS. Your data never leaves your infrastructure.',
              color: 'text-violet-400',
              bg: 'bg-violet-400/5'
            },
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-[2rem] border border-white/5 bg-[#0a0a0a] hover:border-white/10 transition-all">
              <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center ${feature.color} mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-neutral-500 leading-relaxed text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-8 py-32 border-t border-white/5 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-emerald-500/5 blur-[100px] rounded-full -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">Ready to build the future?</h2>
          <p className="text-neutral-400 text-lg">Join thousands of developers building amazing projects on local infrastructure.</p>
          <Link 
            href="/dashboard" 
            className="inline-flex px-8 py-4 rounded-xl bg-white text-black font-bold hover:bg-neutral-200 transition-all"
          >
            Create Your First Project
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-20 border-t border-white/5 bg-[#030303]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 text-sm text-neutral-500">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg tracking-tighter">
              <div className="w-5 h-5 bg-emerald-500 rounded text-black flex items-center justify-center text-[10px]">N</div>
              Ner-Data-Base
            </div>
            <p className="max-w-xs">A plataforma de infraestrutura local definitiva para desenvolvedores modernos.</p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="space-y-4">
              <p className="text-white font-bold uppercase tracking-widest text-[10px]">Product</p>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Database</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Auth</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Functions</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-white font-bold uppercase tracking-widest text-[10px]">Resources</p>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Guides</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-white font-bold uppercase tracking-widest text-[10px]">Company</p>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex justify-between items-center text-xs text-neutral-600 font-medium uppercase tracking-widest">
          <p>© 2026 Ner-Data-Base · Proudly Self-Hosted</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">GitHub</Link>
            <Link href="#" className="hover:text-white transition-colors">Discord</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

