"use client";

import { FormEvent, useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Falha no login");
      return;
    }

    location.href = "/";
  }

  return (
    <main className="container" style={{maxWidth:500}}>
      <div className="card">
        <h1>NeerCloud Local</h1>
        <p className="muted">Acesso administrativo</p>
        <form onSubmit={submit}>
          <label>Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="error">{error}</div>}
          <button type="submit">Entrar</button>
        </form>
      </div>
    </main>
  );
}
