// src/components/nova_consulta/index.jsx
import React, { useMemo, useState } from "react";
import "./index.css";

import { Layers, Target, Users, Network, CheckCircle2, Loader2 } from "lucide-react";

function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

/**
 * profundidade:
 * 1 = Só o documento
 * 2 = Sócios do CNPJ / Empresas do CPF
 * 3 = Outras empresas dos sócios / Sócios do CPF (expandido)
 */
const DEPTH_OPTIONS = [
  {
    key: 1,
    title: "Somente o CNPJ/CPF informado",
    desc: "Consulta direta apenas do documento digitado.",
    Icon: Target,
    badge: "Nível 1",
  },
  {
    key: 2,
    title: "Sócios do CNPJ / Empresas do CPF",
    desc: "Expande 1 nível: pessoas/empresas relacionadas.",
    Icon: Users,
    badge: "Nível 2",
  },
  {
    key: 3,
    title: "Outras empresas dos Sócios / Sócios do CPF",
    desc: "Expande mais: rede completa (até 3 níveis).",
    Icon: Network,
    badge: "Nível 3",
  },
];

const TYPE_OPTIONS = [
  { key: "REPUTATIONAL", label: "Reputacional" },
  { key: "CREDIT", label: "Crédito" },
  { key: "PRO_SCORE", label: "Score (PRO_SCORE)" },
  { key: "REGISTRATION_INTEGRITY", label: "Integridade Cadastral" },
  { key: "SOCIO_ENVIRONMENTAL", label: "Ambiental" },
];

export default function NovaConsulta({ backendBase = "http://localhost:5502", onClose, onDone }) {
  const [doc, setDoc] = useState("");
  const [depth, setDepth] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(() => new Set(["REPUTATIONAL"]));

  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [error, setError] = useState(null);

  const docDigits = useMemo(() => digitsOnly(doc), [doc]);

  function toggleType(key) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addLog(line) {
    setLog((prev) => [{ t: new Date().toISOString(), line }, ...prev].slice(0, 40));
  }

  // ✅ Por enquanto: só UI + "simulação" (sem mexer no backend)
  async function executar() {
    const d = docDigits;
    if (!d) {
      setError("Digite um CPF/CNPJ válido.");
      return;
    }
    if (selectedTypes.size === 0) {
      setError("Selecione ao menos 1 tipo de pesquisa.");
      return;
    }

    setError(null);
    setLoading(true);
    setLog([]);

    try {
      // ✅ Hoje: só demonstração de fluxo (sem chamar nada “profundo” ainda).
      // ✅ Porém: se você quiser, pode já chamar os endpoints bulk_consult_save (um por tipo)
      // no futuro. Por enquanto, só simula.
      addLog(`Documento: ${d}`);
      addLog(`Profundidade selecionada: Nível ${depth}`);
      addLog(`Pesquisas: ${Array.from(selectedTypes).join(", ")}`);
      addLog("✅ (Demo) Painel pronto: no futuro isso vai alimentar a query/orquestrador.");

      // Pequena pausa para sensação de execução (UI)
      await new Promise((r) => setTimeout(r, 450));

      // entrega pro pai preencher o doc e recarregar a tela agregada
      if (onDone) onDone({ docDigits: d, depth, types: Array.from(selectedTypes) });
    } catch (e) {
      setError("Falha ao executar. (Por enquanto é só UI mesmo.)");
    } finally {
      setLoading(false);
    }
  }

  const selectedDepth = DEPTH_OPTIONS.find((x) => x.key === depth);

  return (
    <div className="nc-wrap">
      {/* TOP */}
      <div className="nc-top">
        <div className="nc-titleRow">
          <div className="nc-title">
            <Layers size={18} />
            Nova Consulta
          </div>
          <div className="nc-sub">Escolha documento, profundidade e quais pesquisas rodar.</div>
        </div>
      </div>

      {/* FORM */}
      <div className="nc-grid">
        {/* Coluna esquerda */}
        <div className="nc-col">
          <div className="nc-card">
            <div className="nc-cardTitle">Documento</div>

            <label className="nc-label">CPF/CNPJ</label>
            <input
              className="nc-input"
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="ex: 29796080000115"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  executar();
                }
              }}
            />

            <div className="nc-hint">
              Dica: pode colar com pontos/traços. Eu salvo somente os dígitos:{" "}
              <b>{docDigits || "—"}</b>
            </div>
          </div>

          <div className="nc-card">
            <div className="nc-cardTitle">Tipos de pesquisa</div>

            <div className="nc-chips">
              {TYPE_OPTIONS.map((t) => {
                const active = selectedTypes.has(t.key);
                return (
                  <button
                    type="button"
                    key={t.key}
                    className={`nc-chip ${active ? "is-on" : ""}`}
                    onClick={() => toggleType(t.key)}
                  >
                    <span className={`nc-chipDot ${active ? "is-on" : ""}`} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="nc-hint">
              Selecionadas: <b>{selectedTypes.size}</b>
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="nc-col">
          <div className="nc-card">
            <div className="nc-cardTitle">Profundidade da pesquisa</div>

            <div className="nc-depth">
              {DEPTH_OPTIONS.map((opt) => {
                const active = opt.key === depth;
                const Icon = opt.Icon;

                return (
                  <button
                    type="button"
                    key={opt.key}
                    className={`nc-depthCard ${active ? "is-active" : ""}`}
                    onClick={() => setDepth(opt.key)}
                  >
                    <div className={`nc-radio ${active ? "is-active" : ""}`} />
                    <div className="nc-depthMain">
                      <div className="nc-depthHead">
                        <span className="nc-badge">{opt.badge}</span>
                        <span className="nc-depthTitle">{opt.title}</span>
                      </div>
                      <div className="nc-depthDesc">{opt.desc}</div>
                    </div>
                    <div className={`nc-depthIcon ${active ? "is-active" : ""}`}>
                      <Icon size={18} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview do que isso significa */}
            <div className="nc-preview">
              <div className="nc-previewTitle">
                <CheckCircle2 size={16} />
                Preview
              </div>
              <div className="nc-previewLine">
                <b>Documento:</b> {docDigits || "—"}
              </div>
              <div className="nc-previewLine">
                <b>Profundidade:</b> {selectedDepth?.badge} — {selectedDepth?.title}
              </div>
              <div className="nc-previewLine">
                <b>Pesquisas:</b>{" "}
                {selectedTypes.size ? Array.from(selectedTypes).join(", ") : "—"}
              </div>
              <div className="nc-previewHint">
                (Ainda não roda “de verdade”. Na próxima etapa a gente pluga isso em uma query/orquestrador.)
              </div>
            </div>
          </div>

          <div className="nc-actions">
            <button className="nc-btn nc-btnGhost" type="button" onClick={onClose} disabled={loading}>
              Cancelar
            </button>

            <button className="nc-btn" type="button" onClick={executar} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="nc-spin" />
                  Executando...
                </>
              ) : (
                "Executar"
              )}
            </button>
          </div>

          {error ? <div className="nc-error">{error}</div> : null}

          <div className="nc-card">
            <div className="nc-cardTitle">Log</div>
            <div className="nc-log">
              {!log.length ? (
                <div className="nc-empty">Nenhuma execução ainda.</div>
              ) : (
                log.map((it, idx) => (
                  <div className="nc-logLine" key={idx}>
                    <span className="nc-logTime">{it.t.slice(11, 19)}</span>
                    <span className="nc-logTxt">{it.line}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
