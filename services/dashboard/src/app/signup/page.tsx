"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, User, ArrowLeft, ChevronRight, Mail } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('Attempting signup for:', email);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Signup successful:', data.user.email);
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        console.error('Signup failed:', data.error);
        setError(data.error || "Erro ao criar conta");
      }
    } catch (err) {
      console.error('Signup connection error:', err);
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 blur-[150px] rounded-full -z-10"></div>
      
      <Link href="/login" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-white transition-colors group z-50">
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Voltar ao login
      </Link>

      <div className="w-full max-w-md p-8 z-10">
        <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
          
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Criar sua Conta</h2>
            <p className="text-neutral-500 text-sm">Comece a gerenciar sua infraestrutura local hoje.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  type="email"
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="Seu melhor email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="Crie uma senha forte"
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
              {loading ? "Criando conta..." : "Criar Conta"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-neutral-600 font-bold uppercase tracking-widest">
            Já tem uma conta? <Link href="/login" className="text-emerald-500 hover:text-emerald-400">Entre aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
