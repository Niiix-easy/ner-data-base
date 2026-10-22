import React from 'react';
import Link from 'next/link';
import { Database, ShieldCheck, Zap, Server, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            NeerCloud
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link href="#" className="hover:text-black">Produto</Link>
            <Link href="#" className="hover:text-black">Desenvolvedores</Link>
            <Link href="#" className="hover:text-black">Soluções</Link>
            <Link href="/pricing" className="hover:text-black">Preços</Link>
            <Link href="#" className="hover:text-black">Documentos</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-gray-600">Entrar</Link>
            <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition">Comece seu projeto</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="px-8 py-20 max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-6xl font-medium tracking-tighter mb-6 leading-tight">
            Construa em um fim de semana<br />
            <span className="text-green-600">Escala para milhões</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-lg">
            Comece seu projeto com um banco de dados Postgres. Adicione autenticação, APIs de dados, funções de borda, dados em tempo real, armazenamento e incorporações vetoriais.
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard" className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition">Comece seu projeto</Link>
            <Link href="#" className="px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 font-medium transition">Solicite uma demonstração</Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="px-8 py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Database, title: 'Banco de dados Postgres', desc: 'Cada projeto é um banco de dados Postgres completo.' },
            { icon: ShieldCheck, title: 'Autenticação', desc: 'Adicione cadastros e logins de usuários, protegendo seus dados.' },
            { icon: Server, title: 'Funções de Borda', desc: 'Escreva código personalizado facilmente sem precisar implantar ou gerenciar servidores.' },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-md transition">
              <feature.icon className="text-gray-900 mb-4" size={24} />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-10 text-center text-gray-500 text-sm border-t border-gray-200">
        &copy; 2026 NeerCloud.
      </footer>
    </div>
  );
}
