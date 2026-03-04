// src/pages/historico/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Check, X, Plus } from "lucide-react";
import "./index.css";

import NovaConsulta from "../../components/consulta_individual/nova_consulta";

/* =========================
   Config
========================= */
const API_BASE = "http://localhost:5502";

/* =========================
   Utils
========================= */
function onlyDigits(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

function formatCpfCnpjBR(value) {
  const d = onlyDigits(value);

  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return value || "";
}

function statusLabel(status) {
  const s = (status || "").toString().trim().toUpperCase();
  if (s === "COMPLETED" || s === "OK") return "Completo";
  if (s === "ERROR" || s === "FAILED") return "Erro";
  return status || "—";
}

function isErrorStatus(status) {
  const s = (status || "").toString().trim().toUpperCase();
  return s === "ERROR" || s === "FAILED";
}

/* =========================
   Date helpers
========================= */
function parseDate(datetime) {
  if (!datetime) {
    return {
      dateKey: "0000-00-00",
      day: 0,
      monthName: "",
      year: 0,
      dayName: "",
      time: "",
    };
  }

  const [datePart, timePartRaw] = datetime.split("T");
  const [y, m, d] = (datePart || "1970-01-01").split("-").map(Number);

  const jsDate = new Date(y, (m || 1) - 1, d || 1);

  const dayName = jsDate.toLocaleDateString("pt-BR", { weekday: "long" });
  const monthName = jsDate.toLocaleDateString("pt-BR", { month: "long" });

  const timePart = (timePartRaw || "").replace("Z", "");
  const time = timePart ? timePart.split(".")[0] : "";

  return {
    dateKey: datePart,
    day: d,
    monthName,
    year: y,
    dayName,
    time,
  };
}

function groupByDate(items) {
  const map = new Map();

  items.forEach((c) => {
    const info = parseDate(c.datetime);

    if (!map.has(info.dateKey)) {
      map.set(info.dateKey, { info, items: [] });
    }

    map.get(info.dateKey).items.push(c);
  });

  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

/* =========================
   Modal
========================= */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="ck-modalRoot" role="dialog" aria-modal="true">
      <div className="ck-modalOverlay" onClick={onClose} />
      <div className="ck-modal">
        <div className="ck-modalHead">
          <div className="ck-modalTitle">{title || "Nova consulta"}</div>
          <button className="ck-modalClose" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="ck-modalBody">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Normalização
========================= */
function normalizeHistoricoItem(it) {
  const cpfCnpj = it.cpf ?? it.cpf_cnpj ?? it.document ?? "";

  return {
    id: it.id || it._id,
    cpfRaw: onlyDigits(cpfCnpj),
    cpf: formatCpfCnpjBR(cpfCnpj),
    nome: it.nome || "—",
    datetime: it.datetime || "1970-01-01T00:00:00",
    tipo: it.tipo || it.consult_type || "—",
    status: statusLabel(it.status),
    _statusRaw: it.status,
    empresasPesquisadas: Number(it.empresasPesquisadas ?? 0),
    pessoasRelacionadas: Number(it.pessoasRelacionadas ?? 0),
    empresasRelacionadas: Number(it.empresasRelacionadas ?? 0),
  };
}

/* ========================= */

export default function Historico({ onOpenDoc }) {
  const [items, setItems] = useState([]);
  const [novaOpen, setNovaOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  async function loadHistorico() {
    setLoading(true);
    setErrMsg("");

    const url = `${API_BASE}/api/historico/reputational?limit=50`;

    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // ✅ DEBUG: isso aqui resolve a “esquizofrenia” em 1 print
      const text = await res.text();

      console.log("[HISTORICO] fetch url:", url);
      console.log("[HISTORICO] status:", res.status, "ok:", res.ok, "finalURL:", res.url);
      console.log("[HISTORICO] response (first 300 chars):", text.slice(0, 300));

      if (!res.ok) {
        // mostra status + um pedaço do body pra você ver se é HTML, JSON, erro, etc.
        throw new Error(`Erro ao buscar histórico. (HTTP ${res.status})`);
      }

      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        // se isso acontecer, o backend “200” pode estar devolvendo HTML, redirect, etc.
        throw new Error("Histórico retornou uma resposta inválida (não é JSON).");
      }

      const normalized = (data?.items || []).map(normalizeHistoricoItem);
      setItems(normalized);
    } catch (e) {
      console.error("[HISTORICO] ERRO:", e);
      setErrMsg(e?.message || "Erro inesperado ao buscar histórico.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistorico();
  }, []);

  const grouped = useMemo(() => groupByDate(items), [items]);

  return (
    <div className="historico-page">
      <Modal open={novaOpen} title="Nova consulta" onClose={() => setNovaOpen(false)}>
        <NovaConsulta
          backendBase={API_BASE}
          onClose={() => setNovaOpen(false)}
          onDone={() => {
            setNovaOpen(false);
            loadHistorico();
          }}
        />
      </Modal>

      <div className="historico-shell">
        <div className="historico-top">
          <div>
            <h1>Histórico</h1>
            <p>Lista de análises realizadas</p>
          </div>

          <button className="btn-nova" onClick={() => setNovaOpen(true)}>
            <Plus size={16} />
            Nova Consulta
          </button>
        </div>

        {errMsg && (
          <div className="historico-error">
            <strong>Erro:</strong> {errMsg}
          </div>
        )}

        {loading && <div>Carregando histórico...</div>}

        <div className="timeline">
          {grouped.map(([dateKey, { info, items: groupItems }]) => (
            <div key={dateKey} className="timeline-group">
              <div className="timeline-date">
                <div className="timeline-day">{info.day}</div>
                <div>
                  <div className="timeline-week">{info.dayName}</div>
                  <div className="timeline-month">
                    {info.monthName} {info.year}
                  </div>
                </div>
              </div>

              <div className="timeline-items">
                {groupItems.map((c) => {
                  const erro = isErrorStatus(c._statusRaw);

                  return (
                    <div
                      key={c.id}
                      className="timeline-item"
                      role="button"
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        console.log("[HISTORICO] clicou item -> cpfRaw:", c.cpfRaw, "cpf:", c.cpf);
                        onOpenDoc?.(c.cpfRaw);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          console.log("[HISTORICO] ENTER/SPACE -> cpfRaw:", c.cpfRaw);
                          onOpenDoc?.(c.cpfRaw);
                        }
                      }}
                    >
                      <div className="timeline-left">
                        <span className="timeline-time">{parseDate(c.datetime).time.slice(0, 5)}</span>

                        <div className={`timeline-status ${erro ? "error" : "success"}`}>
                          {erro ? <X size={12} /> : <Check size={12} />}
                        </div>
                      </div>

                      <div className="timeline-card">
                        <div className="timeline-card-top">
                          <span className="cpf">{c.cpf}</span>
                          <span className="nome">{c.nome}</span>
                          <span className="badge">{c.tipo}</span>
                        </div>

                        <div className="timeline-card-bottom">
                          <span>
                            <strong>{c.empresasPesquisadas}</strong> empresas
                          </span>
                          <span>
                            <strong>{c.pessoasRelacionadas}</strong> pessoas
                          </span>
                          <span>
                            <strong>{c.empresasRelacionadas}</strong> empresas rel.
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}