import React, { useEffect, useMemo, useState } from "react";
import { Check, X, Plus } from "lucide-react";
import "./index.css";

// ✅ usa o NovaConsulta que você já criou
import NovaConsulta from "../../components/consulta_individual/nova_consulta";

/* =========================
   MOCK
========================= */

const mockData = [
  {
    id: "1",
    cpf: "153.727.008-74",
    nome: "CARLOS EDUARDO MENDES",
    datetime: "2026-02-20T14:32",
    tipo: "Múltipla",
    status: "Completo",
    empresasPesquisadas: 5,
    pessoasRelacionadas: 12,
    empresasRelacionadas: 3,
  },
  {
    id: "2",
    cpf: "098.432.100-55",
    nome: "ANA PAULA FERREIRA",
    datetime: "2026-02-20T11:10",
    tipo: "Crédito",
    status: "Completo",
    empresasPesquisadas: 1,
    pessoasRelacionadas: 4,
    empresasRelacionadas: 1,
  },
  {
    id: "3",
    cpf: "421.003.987-12",
    nome: "ROBERTO ALVES LIMA",
    datetime: "2026-02-19T16:45",
    tipo: "Processo",
    status: "Erro",
    empresasPesquisadas: 0,
    pessoasRelacionadas: 0,
    empresasRelacionadas: 0,
  },
];

/* ========================= */

function parseDate(datetime) {
  const [date, time] = datetime.split("T");
  const [y, m, d] = date.split("-").map(Number);

  const jsDate = new Date(y, m - 1, d);

  const dayName = jsDate.toLocaleDateString("pt-BR", { weekday: "long" });
  const monthName = jsDate.toLocaleDateString("pt-BR", { month: "long" });

  return {
    dateKey: date,
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

/* ========================= */

export default function Historico() {
  const [cpfFilter, setCpfFilter] = useState("");
  const [nomeFilter, setNomeFilter] = useState("");
  const [dataFilter, setDataFilter] = useState("");

  // ✅ popup NovaConsulta
  const [novaOpen, setNovaOpen] = useState(false);

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
    return mockData.filter((c) => {
      const cpfMatch =
        !cpfFilter ||
        c.cpf.replace(/\D/g, "").includes(cpfFilter.replace(/\D/g, ""));

      const nomeMatch =
        !nomeFilter ||
        c.nome.toLowerCase().includes(nomeFilter.toLowerCase());

      const dataMatch = !dataFilter || c.datetime.startsWith(dataFilter);

      return cpfMatch && nomeMatch && dataMatch;
    });
  }, [cpfFilter, nomeFilter, dataFilter]);

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
          backendBase="http://localhost:5502"
          onClose={() => setNovaOpen(false)}
          onDone={() => setNovaOpen(false)}
        />
      </Modal>

      {/* Painel "embrulhando" tudo (dimensionamento que você disse que funciona) */}
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
          {grouped.map(([dateKey, { info, items }]) => (
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
                  items.length >= 2 ? "has-line" : "no-line"
                }`}
              >
                {items.map((c, idx) => {
                  const isLast = idx === items.length - 1;
                  const parsed = parseDate(c.datetime);

                  return (
                    <div
                      key={c.id}
                      className={`timeline-item ${isLast ? "is-last" : ""}`}
                    >
                      <div className="timeline-left">
                        <span className="timeline-time">{parsed.time}</span>

                        <div
                          className={`timeline-status ${
                            c.status === "Erro" ? "error" : "success"
                          }`}
                        >
                          {c.status === "Erro" ? (
                            <X size={12} />
                          ) : (
                            <Check size={12} />
                          )}
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