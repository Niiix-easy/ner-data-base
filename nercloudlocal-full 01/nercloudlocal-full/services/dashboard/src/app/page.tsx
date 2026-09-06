"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [me, setMe] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/health").then(r => r.json())
    ]).then(([user, health]) => {
      setMe(user.user);
      setStatus(health);
    });
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/login";
  }

  return (
    <main className="container">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1>NeerCloud Local</h1>
          <p className="muted">Painel administrativo</p>
        </div>
        <button onClick={logout}>Sair</button>
      </div>
      <div className="grid">
        <div className="card">
          <h2>Usuário</h2>
          <p>{me?.name ?? "Carregando..."}</p>
          <p className="muted">{me?.email}</p>
          <p>Perfil: {me?.role}</p>
        </div>
        <div className="card">
          <h2>Sistema</h2>
          <p>API: {status?.status ?? "..."}</p>
          <p>PostgreSQL: {status?.services?.postgres ?? "..."}</p>
          <p>Redis: {status?.services?.redis ?? "..."}</p>
        </div>
      </div>
    </main>
  );
}
