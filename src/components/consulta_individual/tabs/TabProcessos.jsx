import React, { useMemo, useState } from "react";
import { getKappiAnalyses, pickAnalysisByTitle } from "../utils/kappi";
import { translateKey } from "../utils/translate";

/* =========================
   Helpers
========================= */
function normStr(v) {
  return (v == null ? "" : String(v)).trim().toUpperCase();
}
function digitsOnly(v) {
  return (v == null ? "" : String(v)).replace(/\D+/g, "");
}
function uniqSorted(arr) {
  const set = new Set();
  for (const x of arr) {
    const s = String(x || "").trim();
    if (s) set.add(s);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function safeLabel(s) {
  const t = String(s || "").trim();
  return t || "—";
}

export default function TabProcessos({ kappiObj }) {
  const analyses = getKappiAnalyses(kappiObj);
  if (!analyses.length) return <div className="ck-empty">Sem dados</div>;

  const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
  if (!legal) return <div className="ck-empty">Sem dados</div>;

  const cases = Array.isArray(legal.case_lists_by_document) ? legal.case_lists_by_document : [];
  if (!cases.length) return <div className="ck-empty">Sem dados</div>;

  const headers = [
    "alert",
    "type",
    "jurisdiction",
    "process_class",
    "process_status",
    "degree",
    "state",
    "claim_value",
    "process_number",
    "process_url",
    "subjects",
    "case_movements",
  ];

  // ✅ filtros
  const [qProc, setQProc] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fClass, setFClass] = useState("");
  const [fType, setFType] = useState("");

  const statusOptions = useMemo(() => uniqSorted(cases.map((c) => c?.process_status).filter(Boolean)), [cases]);
  const classOptions = useMemo(() => uniqSorted(cases.map((c) => c?.process_class).filter(Boolean)), [cases]);
  const typeOptions = useMemo(() => uniqSorted(cases.map((c) => c?.type).filter(Boolean)), [cases]);

  const filteredCases = useMemo(() => {
    const q = digitsOnly(qProc);

    return cases.filter((c) => {
      if (q) {
        const pn = digitsOnly(c?.process_number);
        if (!pn.includes(q)) return false;
      }
      if (fStatus && normStr(c?.process_status) !== normStr(fStatus)) return false;
      if (fClass && normStr(c?.process_class) !== normStr(fClass)) return false;
      if (fType && normStr(c?.type) !== normStr(fType)) return false;
      return true;
    });
  }, [cases, qProc, fStatus, fClass, fType]);

  function clearFilters() {
    setQProc("");
    setFStatus("");
    setFClass("");
    setFType("");
  }

  return (
    <div className="ck-section">
      <div className="ck-section__title">Processos</div>

      {/* ✅ AQUI É A MUDANÇA VISÍVEL: BARRA DE FILTROS */}
      <div className="ck-procFilters">
        <div className="ck-procField">
          <div className="ck-procLabel">Buscar por nº do processo</div>
          <input
            className="ck-procInput"
            value={qProc}
            onChange={(e) => setQProc(e.target.value)}
            placeholder="Ex: 1030533-84.2020.4.01.4000"
          />
        </div>

        <div className="ck-procField">
          <div className="ck-procLabel">Status do processo</div>
          <select className="ck-procSelect" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Todos</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {safeLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="ck-procField">
          <div className="ck-procLabel">Classe processual</div>
          <select className="ck-procSelect" value={fClass} onChange={(e) => setFClass(e.target.value)}>
            <option value="">Todas</option>
            {classOptions.map((s) => (
              <option key={s} value={s}>
                {safeLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="ck-procField">
          <div className="ck-procLabel">Tipo</div>
          <select className="ck-procSelect" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">Todos</option>
            {typeOptions.map((s) => (
              <option key={s} value={s}>
                {safeLabel(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="ck-procActions">
          <button type="button" className="ck-procBtn" onClick={clearFilters}>
            Limpar
          </button>
        </div>
      </div>

      <div className="ck-procHint">
        Exibindo <b>{filteredCases.length}</b> de <b>{cases.length}</b> processos.
      </div>

      <div className="ck-sheetTableWrap">
        <table className="ck-sheetTable">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{translateKey(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c, i) => (
              <tr key={i}>
                {headers.map((h) => {
                  const v = c?.[h];

                  if (h === "process_url" && v) {
                    return (
                      <td key={h}>
                        <a className="ck-link" href={String(v)} target="_blank" rel="noreferrer">
                          Abrir
                        </a>
                      </td>
                    );
                  }

                  return <td key={h}>{v == null || String(v).trim() === "" ? "—" : String(v)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
