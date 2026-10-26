"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col min-h-screen bg-[#030303] text-white p-12 lg:p-20 space-y-12">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tighter capitalize">Settings</h1>
        <p className="text-neutral-500 font-medium">Gerencie suas preferências de conta e do painel.</p>
      </header>

      <div className="max-w-4xl space-y-8">
        <section className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-white/5">
            <h2 className="text-xl font-bold">Aparência</h2>
            <p className="text-sm text-neutral-500 mt-1">Personalize como o Ner-Data-Base aparece no seu dispositivo.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-bold">Tema da Interface</p>
                <p className="text-xs text-neutral-600">Escolha entre o modo escuro clássico ou o modo claro de alto contraste.</p>
              </div>
              
              <div className="flex bg-[#030303] border border-white/5 p-1 rounded-xl">
                <button 
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'light' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Sun size={14} />
                  Light
                </button>
                <button 
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${theme === 'dark' ? 'bg-white text-black shadow-lg' : 'text-neutral-500 hover:text-white'}`}
                >
                  <Moon size={14} />
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-8 flex items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
             <Monitor size={24} />
          </div>
          <div>
            <h3 className="font-bold">Sincronização de Sistema</h3>
            <p className="text-sm text-neutral-500 mt-1">Suas preferências de tema são salvas localmente e sincronizadas com seu navegador.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

