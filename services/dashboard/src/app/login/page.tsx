"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, User, ArrowLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: username, password }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Autenticação falhou");
      }
    } catch (err) {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ 
        backgroundImage: `radial-gradient(circle at 2px 2px, #333 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 blur-[150px] rounded-full -z-10"></div>
      
      {/* Back Button */}
      <Link 
        href="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-white transition-colors group z-50"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar ao início
      </Link>

      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 p-8 z-10">
        {/* Left: Marketing / Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-12 pr-12 text-left">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Secure Local Environment
            </div>
            <h1 className="text-6xl font-bold tracking-tighter leading-none text-left">
              Ner-Data-Base
            </h1>
            <p className="text-xl text-neutral-400 leading-relaxed max-w-md text-left">
              A poderosa plataforma Backend-as-a-Service, totalmente focada no seu ambiente local ZimaOS.
            </p>
          </div>

          <div className="space-y-6 text-left">
            {[
              "Editor SQL Inteligente integrado",
              "Edge Functions com Deno",
              "Gerenciamento Visual de Storage S3",
              "100% self-hosted e seguro"
            ].map((item) => (
              <div key={item} className="flex items-center gap-4 group justify-start">
                <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                  <ChevronRight size={14} />
                </div>
                <span className="text-neutral-300 font-medium">{item}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-neutral-600 font-medium uppercase tracking-[0.2em] text-left">
            © 2026 Ner-Data-Base · Proudly Local
          </p>
        </div>

        {/* Right: Login Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 lg:p-14 shadow-2xl relative overflow-hidden text-left">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
            
            <div className="mb-10 text-left">
              <h2 className="text-3xl font-bold tracking-tight mb-2 text-left">Acesso ao Painel</h2>
              <p className="text-neutral-500 text-sm text-left">Faça login com suas credenciais de administrador.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-4">
                <div className="relative group text-left">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                    placeholder="Nome de usuário ou email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                
                <div className="relative group text-left">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                    placeholder="Sua senha secreta"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <Link href="#" className="text-xs font-bold text-neutral-600 hover:text-white uppercase tracking-widest transition-colors">
                  Esqueci minha senha
                </Link>
                <Link href="#" className="text-xs font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">
                  Primeiro acesso?
                </Link>
              </div>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs font-bold text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold hover:bg-neutral-200 disabled:opacity-50 transition-all shadow-xl shadow-white/5 active:scale-[0.98]"
              >
                {loading ? "Autenticando..." : "Entrar no Painel"}
              </button>
            </form>

            <div className="mt-12 flex items-center gap-4 text-center">
              <div className="h-px flex-1 bg-white/5"></div>
              <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-[0.3em]">ou continue com</span>
              <div className="h-px flex-1 bg-white/5"></div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
               <button className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all text-xs font-bold">
                 GitHub
               </button>
               <button className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-3 rounded-xl hover:bg-white/10 transition-all text-xs font-bold">
                 GitLab
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
