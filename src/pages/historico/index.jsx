// src/pages/historico/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Check, X, Plus } from "lucide-react";
import "./index.css";

// ✅ usa o NovaConsulta que você já criou
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

  // CPF (11)
  if (d.length === 11) {
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  // CNPJ (14)
  if (d.length === 14) {
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return value || "";
}

function statusLabel(status) {
  const s = (status || "").toString().trim().toUpperCase();

  // backend: COMPLETED, ERROR, etc.
  if (s === "COMPLETED" || s === "COMPLETE" || s === "OK") return "Completo";
  if (s === "ERROR" || s === "FAILED" || s === "FAIL") return "Erro";

  // fallback
  return status || "—";
}

function isErrorStatus(status) {
  const s = (status || "").toString().trim().toUpperCase();
  return s === "ERROR" || s === "FAILED" || s === "FAIL" || s === "ERRO";
}

/* =========================
   Date helpers
========================= */
function parseDate(datetime) {
  // datetime pode vir sem "T" ou com "Z" etc.
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

  // "03:16:03.66+00:00" -> pega só HH:MM (ou HH:MM:SS)
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

  // ordena datas desc
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

/* =========================
   Modal (igual consulta_individual)
========================= */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="ck-modalRoot" role="dialog" aria-modal="true">
      <div className="ck-modalOverlay" onClick={onClose} />

      <div className="ck-modal">
        <div className="ck-modalHead">
          <div className="ck-modalTitle">{title || "Nova consulta"}</div>

          <button
            className="ck-modalClose"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="ck-modalBody">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Normalização do payload
========================= */
function normalizeHistoricoItem(it) {
  // sua API já vem bem perto do mock; aqui só padronizamos e formatamos cpf/cnpj
  const cpfCnpj = it.cpf ?? it.cpf_cnpj ?? it.document ?? "";

  return {
    id: it.id || it._id, // chave do react
    cpf: formatCpfCnpjBR(cpfCnpj),
    nome: it.nome || "—",
    datetime: it.datetime || "1970-01-01T00:00:00",
    tipo: it.tipo || it.consult_type || "—",
    status: statusLabel(it.status),
    _statusRaw: it.status, // pra decidir ícone/estilo
    empresasPesquisadas: Number(it.empresasPesquisadas ?? 0),
    pessoasRelacionadas: Number(it.pessoasRelacionadas ?? 0),
    empresasRelacionadas: Number(it.empresasRelacionadas ?? 0),
  };
}

/* ========================= */

export default function Historico() {
  const [cpfFilter, setCpfFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const [dataFilter, setDataFilter] = useState("");

  // ✅ popup NovaConsulta
  const [novaOpen, setNovaOpen] = useState(false);

  // ✅ dados reais
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const LIMIT = 50;

  async function loadHistorico() {
    setLoading(true);
    setErrMsg("");

    try {
      const url = `${API_BASE}/api/historico/reputational?limit=${LIMIT}`;

      const res = await fetch(url, {
        method: "GET",
        credentials: "include", // ✅ IMPORTANTE: manda cookies JWT
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} - ${txt || "erro ao buscar histórico"}`);
      }

      const data = await res.json();

      const list = Array.isArray(data?.items) ? data.items : [];
      const normalized = list.map(normalizeHistoricoItem);

      setItems(normalized);
    } catch (e) {
      setErrMsg(e?.message || "Erro ao carregar histórico.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // carrega histórico ao abrir a página
  useEffect(() => {
    loadHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC fecha + trava scroll
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setNovaOpen(false);
    }

    if (novaOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [novaOpen]);

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const cpfMatch =
        !cpfFilter ||
        onlyDigits(c.cpf).includes(onlyDigits(cpfFilter));

      const nomeMatch =
        !nomeFilter ||
        (c.nome || "").toLowerCase().includes((nomeFilter || "").toLowerCase());

      const dataMatch = !dataFilter || (c.datetime || "").startsWith(dataFilter);

      return cpfMatch && nomeMatch && dataMatch;
    });
  }, [items, cpfFilter, nomeFilter, dataFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="historico-page">
      {/* ✅ Modal Nova Consulta (popup) */}
      <Modal
        open={novaOpen}
        title="Nova consulta (salvar no Mongo)"
        onClose={() => setNovaOpen(false)}
      >
        <NovaConsulta
          backendBase={API_BASE}
          onClose={() => setNovaOpen(false)}
          onDone={() => {
            setNovaOpen(false);
            // ✅ recarrega histórico depois de criar nova consulta
            loadHistorico();
          }}
        />
      </Modal>

      {/* Painel "embrulhando" tudo */}
      <div className="historico-shell">
        {/* HEADER */}
        <div className="historico-top">
          <div>
            <h1>
              Histórico <span>| Consultas</span>
            </h1>
            <p>Lista de análises realizadas</p>
          </div>

          <button
            className="btn-nova"
            type="button"
            onClick={() => setNovaOpen(true)}
          >
            <Plus size={16} />
            Nova Consulta
          </button>
        </div>

        {/* ERRO / LOADING */}
        {errMsg ? (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(239,68,68,.35)",
              background: "rgba(239,68,68,.08)",
              fontSize: 13,
            }}
          >
            <strong>Erro:</strong> {errMsg}
          </div>
        ) : null}

        {loading ? (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,.08)",
              background: "rgba(0,0,0,.03)",
              fontSize: 13,
            }}
          >
            Carregando histórico...
          </div>
        ) : null}

        {/* FILTERS */}
        <div className="historico-filters">
          <input
            placeholder="CPF / CNPJ"
            value={cpfFilter}
            onChange={(e) => setCpfFilter(e.target.value)}
          />
          <input
            placeholder="Nome"
            value={nomeFilter}
            onChange={(e) => setNomeFilter(e.target.value)}
          />
          <input
            type="date"
            value={dataFilter}
            onChange={(e) => setDataFilter(e.target.value)}
          />
        </div>

        {/* TIMELINE */}
        <div className="timeline">
          {grouped.length === 0 && !loading ? (
            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,.08)",
                background: "rgba(0,0,0,.03)",
                fontSize: 13,
              }}
            >
              Nenhum item encontrado.
            </div>
          ) : null}

          {grouped.map(([dateKey, { info, items: dayItems }]) => (
            <div key={dateKey} className="timeline-group">
              <div className="timeline-date">
                <div className="timeline-day">{info.day}</div>
                <div>
                  <div className="timeline-week">
                    {info.dayName.charAt(0).toUpperCase() + info.dayName.slice(1)}
                  </div>
                  <div className="timeline-month">
                    {info.monthName} {info.year}
                  </div>
                </div>
              </div>

              {/* wrapper dos items (linha vive aqui) */}
              <div
                className={`timeline-items ${
                  dayItems.length >= 2 ? "has-line" : "no-line"
                }`}
              >
                {dayItems.map((c, idx) => {
                  const isLast = idx === dayItems.length - 1;
                  const parsed = parseDate(c.datetime);

                  const erro = isErrorStatus(c._statusRaw) || c.status === "Erro";

                  return (
                    <div
                      key={c.id}
                      className={`timeline-item ${isLast ? "is-last" : ""}`}
                    >
                      <div className="timeline-left">
                        <span className="timeline-time">
                          {/* se vier vazio, mostra --:-- */}
                          {parsed.time ? parsed.time.slice(0, 5) : "--:--"}
                        </span>

                        <div
                          className={`timeline-status ${erro ? "error" : "success"}`}
                        >
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
                            pesquisadas
                          </span>
                          <span>
                            <strong>{c.pessoasRelacionadas}</strong> Pessoas
                            relacionadas
                          </span>
                          <span>
                            <strong>{c.empresasRelacionadas}</strong> Empresas
                            relacionadas
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