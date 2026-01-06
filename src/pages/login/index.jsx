import React, { useState } from "react";
import "./index.css";

export default function Login() {
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

      // 🔑 AQUI você liga no backend depois
      // ex:
      // await fetch("/api/login", { ... })

      await new Promise((r) => setTimeout(r, 900)); // simulação

      alert("Login realizado com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
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
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
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
