import React, { useState } from "react";
import "./index.css";

const API_BASE = "http://localhost:5502";

export default function Login({ onSuccess }) {
  const [form, setForm] = useState({
    email: "",
    senha: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!form.email || !form.senha) {
        throw new Error("Preencha e-mail e senha.");
      }

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ cookie JWT
        body: JSON.stringify({
          email: form.email,
          senha: form.senha,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao fazer login.");
      }

      // ✅ sucesso: muda para Home
      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || "Erro desconhecido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-main">kuará</span>
          <span className="logo-sub">capital</span>
        </div>

        <h1 className="login-title">Acesso ao painel</h1>
        <p className="login-subtitle">
          Entre com suas credenciais para continuar
        </p>

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <label>E-mail</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={onChange}
              placeholder="seu@email.com"
              autoComplete="username"
            />
          </div>

          <div className="login-field">
            <label>Senha</label>
            <input
              type="password"
              name="senha"
              value={form.senha}
              onChange={onChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          <a href="#">Esqueci minha senha</a>
        </div>
      </div>
    </div>
  );
}