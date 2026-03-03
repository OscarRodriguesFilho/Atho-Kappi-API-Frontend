// src/components/kpis/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

export default function Kpis({ refreshKey = 0 }) {
  // ✅ usa .env (VITE_BACKEND_BASE) e cai pra localhost
  // IMPORTANTE: não use 127.0.0.1 aqui, senão o cookie não casa com localhost
  const BACKEND_BASE =
    (import.meta?.env?.VITE_BACKEND_BASE || "").trim() || "http://localhost:5502";

  const API_KPIS = useMemo(() => `${BACKEND_BASE}/api/kpis`, [BACKEND_BASE]);
  const LIMIT = 200;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  const [status, setStatus] = useState({});
  const [resumoCsv, setResumoCsv] = useState({});

  async function carregarKpis() {
    try {
      setLoading(true);
      setErro(null);

      const url = new URL(API_KPIS);
      url.searchParams.set("limit", String(LIMIT));

      const r = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include", // ✅ ESSENCIAL: envia access_token_cookie
      });

      // ✅ token ausente/expirado (flask_jwt_extended costuma usar 401/422)
      if (r.status === 401 || r.status === 422) {
        const txt = await r.text().catch(() => "");
        // tenta extrair msg do backend
        let msg = "Sessão expirada ou não autenticado. Faça login novamente.";
        try {
          const j = JSON.parse(txt);
          if (j?.msg) msg = j.msg;
          if (j?.error) msg = j.error;
        } catch {
          if (txt) msg = txt;
        }

        setErro(`HTTP ${r.status} — ${msg}`);
        setStatus({});
        setResumoCsv({});
        return;
      }

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(
          `HTTP ${r.status} ${r.statusText}${txt ? ` — ${txt}` : ""}`
        );
      }

      const data = await r.json();

      setStatus(data?.status || {});
      setResumoCsv(data?.resumo_csv || {});
    } catch (e) {
      setErro(e?.message || String(e));
      setStatus({});
      setResumoCsv({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarKpis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_KPIS, refreshKey]); // ✅ recarrega quando o upload dispara refreshKey

  const badge = (ok, okText = "Encontrado", badText = "Não encontrado") => {
    if (ok) return <span className="kpis-badge kpis-badge-ok">{okText}</span>;
    return <span className="kpis-badge kpis-badge-bad">{badText}</span>;
  };

  // helpers seguros (se vier undefined)
  const safe = (v, fallback = "-") =>
    v === undefined || v === null ? fallback : v;

  const comAnalise = resumoCsv?.com_analise || {};
  const semAnalise = resumoCsv?.sem_analise || {};
  const aprovado = resumoCsv?.aprovado || {};
  const atencao = resumoCsv?.atencao || {};
  const reprovado = resumoCsv?.reprovado || {};

  const valorLiquidoAprovadoStr = resumoCsv?.valor_liquido_aprovado_total_str;

  return (
    <section className="kpis-wrap">
      <div className="kpis-container">
        {loading && (
          <div className="kpis-card">
            <div className="kpis-card-header">KPIs</div>
            <div className="kpis-card-body">
              <div className="kpis-loading">Carregando KPIs…</div>
            </div>
          </div>
        )}

        {!loading && erro && (
          <div className="kpis-alert">
            <b>Erro ao buscar KPIs no backend (5502):</b>
            <div className="kpis-mono kpis-err">{erro}</div>
            <button className="kpis-btn" onClick={carregarKpis} type="button">
              Tentar novamente
            </button>

            {/* Dica prática */}
            <div style={{ marginTop: 10, opacity: 0.85, fontSize: 12 }}>
              Se aparecer <span className="kpis-mono">Missing cookie</span>, faça login novamente.
            </div>
          </div>
        )}

        {!loading && !erro && (
          <div className="kpis-card">
            <div className="kpis-card-header">Status atual</div>

            <div className="kpis-card-body">
              <div className="kpis-status">
                <div className="kpis-status-line">
                  <span className="kpis-status-label">CSV:</span>
                  {badge(!!status?.csv_existe)}
                  {status?.csv_existe && (
                    <span className="kpis-status-path kpis-mono">
                      {safe(status?.caminho_csv, "")}
                    </span>
                  )}
                </div>

                {/* (se quiser mostrar também o djson) */}
                {/* <div className="kpis-status-line">
                  <span className="kpis-status-label">DJSON:</span>
                  {badge(!!status?.djson_existe)}
                  {status?.djson_existe && (
                    <span className="kpis-status-path kpis-mono">
                      {safe(status?.caminho_djson, "")}
                    </span>
                  )}
                </div> */}
              </div>

              <div className="kpis-grid">
                {/* 1) Registros / Totais gerais */}
                <div className="kpis-mini">
                  <div className="kpis-mini-label">Registros CSV (amostra)</div>
                  <div className="kpis-mini-value">
                    {safe(resumoCsv?.total_csv, 0)}
                  </div>
                  <div className="kpis-mini-sub">
                    Limite: {LIMIT}
                    <br />
                    Valor total (processo):{" "}
                    {safe(resumoCsv?.valor_total_str, "R$ 0,00")}
                    <br />
                    Valor total negociado:{" "}
                    {safe(resumoCsv?.valor_negociado_total_str, "R$ 0,00")}
                  </div>
                </div>

                {/* 2) Com análise */}
                <div className="kpis-mini">
                  <div className="kpis-mini-label">Com análise</div>
                  <div className="kpis-mini-value">{safe(comAnalise?.qtd, 0)}</div>
                  <div className="kpis-mini-sub">
                    Valor total (processo):{" "}
                    {safe(comAnalise?.valor_total_str, "R$ 0,00")}
                    <br />
                    Valor total negociado:{" "}
                    {safe(comAnalise?.valor_negociado_total_str, "R$ 0,00")}
                    <br />
                    <br />
                    Aprovado: {safe(aprovado?.qtd, 0)} (
                    {safe(aprovado?.valor_total_str, "R$ 0,00")})
                    <br />
                    Atenção: {safe(atencao?.qtd, 0)} (
                    {safe(atencao?.valor_total_str, "R$ 0,00")})
                  </div>
                </div>

                {/* 3) Sem análise */}
                <div className="kpis-mini">
                  <div className="kpis-mini-label">Sem análise</div>
                  <div className="kpis-mini-value">{safe(semAnalise?.qtd, 0)}</div>
                  <div className="kpis-mini-sub">
                    Valor total (processo):{" "}
                    {safe(semAnalise?.valor_total_str, "R$ 0,00")}
                    <br />
                    Valor total negociado:{" "}
                    {safe(semAnalise?.valor_negociado_total_str, "R$ 0,00")}
                    <br />
                    <br />
                    Reprovado: {safe(reprovado?.qtd, 0)} (
                    {safe(reprovado?.valor_total_str, "R$ 0,00")})
                  </div>
                </div>

                {/* 4) ✅ Valor líquido (apenas aprovados) */}
                <div className="kpis-mini">
                  <div className="kpis-mini-label">Valor líquido</div>
                  <div className="kpis-mini-value">
                    {safe(valorLiquidoAprovadoStr, "R$ 0,00")}
                  </div>
                  <div className="kpis-mini-sub">
                    (Valor do processo − valor negociado)
                    <br />
                    <span className="kpis-mono">apenas para aprovados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}