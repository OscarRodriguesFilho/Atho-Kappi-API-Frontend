// src/components/consulta_individual/index.jsx
import React, { useMemo, useState } from "react";
import "./index.css";

const API_BASE = "http://localhost:5502";

function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function KeyValueTable({ data }) {
  if (!data) return <div className="ck-empty">Sem dados</div>;

  // lista
  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="ck-empty">Sem dados</div>;

    if (data.every((x) => isPlainObject(x))) {
      return (
        <div className="ck-list">
          {data.map((item, idx) => (
         
              
              <KeyValueTable data={item} />
         
          ))}
        </div>
      );
    }

    return (
      <ul className="ck-ul">
        {data.map((x, i) => (
          <li key={i}>{String(x)}</li>
        ))}
      </ul>
    );
  }

  // objeto -> tabela
  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) return <div className="ck-empty">Sem dados</div>;

    return (
      <table className="ck-table">
        <thead>
          <tr>
            <th style={{ width: "280px" }}>Campo</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k}>
              <td className="ck-k">{k}</td>
              <td className="ck-v">
                {isPlainObject(v) || Array.isArray(v) ? (
                  <details className="ck-details">
                    <summary>Ver</summary>
                    <div className="ck-details__body">
                      <KeyValueTable data={v} />
                    </div>
                  </details>
                ) : (
                  <span>{v == null ? "Sem dados" : String(v)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // primitivo
  return <div className="ck-empty">{String(data)}</div>;
}

/* =========================
   KAPPI: helpers
========================= */

function normalizeTitle(t) {
  return (t || "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function getKappiRaw(kappiObj) {
  return kappiObj?.extra?.raw || null;
}

function getKappiAnalyses(kappiObj) {
  const raw = getKappiRaw(kappiObj);
  const analyses = raw?.analyses;
  return Array.isArray(analyses) ? analyses : [];
}

function pickAnalysisByTitle(analyses, title) {
  const t = normalizeTitle(title);
  for (const a of analyses) {
    const data = a?.data;
    if (data && normalizeTitle(data.title) === t) return data;
  }
  return null;
}

function pickFirstDonationsAnalysis(analyses) {
  for (const a of analyses) {
    const data = a?.data;
    if (data && isPlainObject(data) && Array.isArray(data.donations)) return data;
  }
  return null;
}

function KappiSheetResumo({ kappiObj }) {
  if (!kappiObj) return <div className="ck-empty">Sem dados</div>;

  const base = {
    _id: kappiObj?._id,
    consult_type: kappiObj?.consult_type,
    document: kappiObj?.document,
    id: kappiObj?.id,
    status: kappiObj?.status,
    saved_at: kappiObj?._meta?.saved_at,
    source: kappiObj?._meta?.source,
    diligence_id: kappiObj?.extra?.diligence_id,
    extra_status: kappiObj?.extra?.status,
  };

  const raw = getKappiRaw(kappiObj);
  const rawResumo = raw
    ? {
        client: raw?.client,
        createdAt: raw?.createdAt,
        user: raw?.user,
        version: raw?.version,
        steps: raw?.steps,
        hasError: raw?.hasError,
        total: raw?.total,
      }
    : null;

  return (
    <div className="ck-stack">
      <div className="ck-section">
        <div className="ck-section__title">Resumo (Kappi)</div>
        <KeyValueTable data={base} />
      </div>

      <div className="ck-section">
        <div className="ck-section__title">Resumo (extra.raw)</div>
        <KeyValueTable data={rawResumo} />
      </div>
    </div>
  );
}

function KappiSheetTotais({ kappiObj }) {
  const raw = getKappiRaw(kappiObj);
  if (!raw) return <div className="ck-empty">Sem dados</div>;

  const entities = Array.isArray(raw.entities) ? raw.entities : [];
  const total = entities.length;

  let pf = 0;
  for (const e of entities) {
    const cpf = (e?.cpf || "").toString().replace(/\D+/g, "");
    if (cpf.length === 11) pf += 1;
  }
  const pe = total - pf;

  // tenta achar totals/alerts dentro do LEGAL PROCESS (quando existir)
  const analyses = getKappiAnalyses(kappiObj);
  const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");

  const totais = {
    total_entidades: total,
    PEcount: pe,
    PFcount: pf,
    totalizers_per_document: legal?.totalizers_per_document ?? null,
    alerts_per_documento: legal?.alerts_per_documento ?? null,
  };

  return <KeyValueTable data={totais} />;
}

function KappiSheetEntidades({ kappiObj }) {
  const raw = getKappiRaw(kappiObj);
  if (!raw) return <div className="ck-empty">Sem dados</div>;
  return <KeyValueTable data={raw.entities || null} />;
}

function KappiSheetAnalises({ kappiObj }) {
  const analyses = getKappiAnalyses(kappiObj);
  if (!analyses.length) return <div className="ck-empty">Sem dados</div>;

  const cards = analyses
    .map((a, idx) => {
      const data = a?.data;
      if (!isPlainObject(data)) return null;

      const head = {
        analysis_id: data?.id ?? a?.id,
        title: data?.title,
        type: data?.type,
        severity: data?.severity,
        ok: data?.ok,
        query_date: data?.query_date,
        _diligence_id: data?._diligence_id,
        _cpf_relation: data?._cpf_relation,
      };

      return { idx, head, data };
    })
    .filter(Boolean);

  return (
    <div className="ck-list">
      {cards.map(({ idx, head, data }) => (
        <div className="ck-card" key={idx}>
          <div className="ck-card__title">{head.title || `Análise ${idx + 1}`}</div>

          <div className="ck-mini">
            <span className="ck-pill">
              <b>Severity:</b> {head.severity ?? "—"}
            </span>
            <span className="ck-pill">
              <b>OK:</b> {head.ok == null ? "—" : String(head.ok)}
            </span>
            <span className="ck-pill">
              <b>Type:</b> {head.type || "—"}
            </span>
          </div>

          <details className="ck-details" style={{ marginTop: 8 }}>
            <summary>Ver detalhes</summary>
            <div className="ck-details__body">
              <KeyValueTable data={data} />
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}

function KappiSheetProcessos({ kappiObj }) {
  const analyses = getKappiAnalyses(kappiObj);
  if (!analyses.length) return <div className="ck-empty">Sem dados</div>;

  const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
  if (!legal) return <div className="ck-empty">Sem dados</div>;

  const cases = Array.isArray(legal.case_lists_by_document) ? legal.case_lists_by_document : [];
  if (!cases.length) return <div className="ck-empty">Sem dados</div>;

  const headers = [
    "alert",
    "type",
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

  return (
    <div className="ck-sheetTableWrap">
      <table className="ck-sheetTable">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cases.map((c, i) => (
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
                return <td key={h}>{v == null ? "—" : String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KappiSheetDoacoes({ kappiObj }) {
  const analyses = getKappiAnalyses(kappiObj);
  if (!analyses.length) return <div className="ck-empty">Sem dados</div>;

  const donationAnalysis = pickFirstDonationsAnalysis(analyses);
  if (!donationAnalysis) return <div className="ck-empty">Sem dados</div>;

  const donations = Array.isArray(donationAnalysis.donations) ? donationAnalysis.donations : [];
  if (!donations.length) return <div className="ck-empty">Sem dados</div>;

  const headers = [
    "politician_ballot_number",
    "politician_full_name",
    "politician_doc_number",
    "election_year",
    "party_name",
    "total_donation_value",
    "donation_recipient",
    "is_crowd_funding",
    "is_cross_donation",
    "party_cross_donation_value",
  ];

  return (
    <div className="ck-sheetTableWrap">
      <table className="ck-sheetTable">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {donations.map((d, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h}>{d?.[h] == null ? "—" : String(d?.[h])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KappiInternalTabs({ kappiObj }) {
  const internalTabs = useMemo(
    () => [
      { key: "ENTIDADES", label: "Dados pessoais" },
      { key: "ANALISES", label: "Analises" },
      { key: "PROCESSOS", label: "Processos" },
      { key: "DOACOES", label: "Doacoes" },
      { key: "TOTAIS", label: "Totais" },
      { key: "RESUMO", label: "Status da consulta" },
      { key: "RAW", label: "RAW" },
    ],
    []
  );

  const [kTab, setKTab] = useState("RESUMO");

  const has = (key) => {
    const raw = getKappiRaw(kappiObj);
    const analyses = getKappiAnalyses(kappiObj);
    if (!kappiObj) return false;

    if (key === "RESUMO") return true;
    if (key === "RAW") return !!raw;
    if (key === "TOTAIS") return !!raw;
    if (key === "ENTIDADES") return Array.isArray(raw?.entities) && raw.entities.length > 0;
    if (key === "ANALISES") return analyses.length > 0;

    if (key === "PROCESSOS") {
      const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
      return Array.isArray(legal?.case_lists_by_document) && legal.case_lists_by_document.length > 0;
    }

    if (key === "DOACOES") {
      const d = pickFirstDonationsAnalysis(analyses);
      return Array.isArray(d?.donations) && d.donations.length > 0;
    }

    return false;
  };

  const renderBody = () => {
    if (!kappiObj) return <div className="ck-empty big">Sem dados de KAPPI.</div>;

    if (kTab === "RESUMO") return <KappiSheetResumo kappiObj={kappiObj} />;
    if (kTab === "TOTAIS") return <KappiSheetTotais kappiObj={kappiObj} />;
    if (kTab === "ENTIDADES") return <KappiSheetEntidades kappiObj={kappiObj} />;
    if (kTab === "ANALISES") return <KappiSheetAnalises kappiObj={kappiObj} />;
    if (kTab === "PROCESSOS") return <KappiSheetProcessos kappiObj={kappiObj} />;
    if (kTab === "DOACOES") return <KappiSheetDoacoes kappiObj={kappiObj} />;
    if (kTab === "RAW") return <pre className="ck-pre">{JSON.stringify(getKappiRaw(kappiObj), null, 2)}</pre>;

    return <div className="ck-empty">Sem dados</div>;
  };

  return (
    <div className="ck-kappi">
      <div className="ck-subtabs">
        {internalTabs.map((t) => {
          const active = t.key === kTab;
          const hasData = has(t.key);
          return (
            <button
              key={t.key}
              className={`ck-subtab ${active ? "is-active" : ""}`}
              onClick={() => setKTab(t.key)}
              title={hasData ? "Abrir" : "Sem dados"}
            >
              <span className="ck-subtab__label">{t.label}</span>
              <span className={`ck-dot ${hasData ? "ok" : ""}`} />
            </button>
          );
        })}
      </div>

      <div className="ck-subbody">{renderBody()}</div>
    </div>
  );
}

/* =========================
   CSV: sub-abas internas (comparação rápida)
   - Dados CSV (original)
   - Entidades Kappi (mesmo da subaba KAPPI->Entidades)
========================= */

function CsvInternalTabs({ csvObj, kappiObj }) {
  const internalTabs = useMemo(
    () => [
      { key: "CSV_DADOS", label: "Dados CSV" },
      { key: "KAPPI_ENTIDADES", label: "Entidades (Kappi)" },
    ],
    []
  );

  const [cTab, setCTab] = useState("CSV_DADOS");

  const raw = getKappiRaw(kappiObj);
  const kEntities = raw?.entities;

  const has = (key) => {
    if (key === "CSV_DADOS") return !!csvObj;
    if (key === "KAPPI_ENTIDADES") return Array.isArray(kEntities) && kEntities.length > 0;
    return false;
  };

  const renderBody = () => {
    if (cTab === "CSV_DADOS") return <KeyValueTable data={csvObj} />;
    if (cTab === "KAPPI_ENTIDADES") return <KeyValueTable data={kEntities || null} />;
    return <div className="ck-empty">Sem dados</div>;
  };

  return (
    <div className="ck-kappi">
      <div className="ck-subtabs">
        {internalTabs.map((t) => {
          const active = t.key === cTab;
          const hasData = has(t.key);
          return (
            <button
              key={t.key}
              className={`ck-subtab ${active ? "is-active" : ""}`}
              onClick={() => setCTab(t.key)}
              title={hasData ? "Abrir" : "Sem dados"}
            >
              <span className="ck-subtab__label">{t.label}</span>
              <span className={`ck-dot ${hasData ? "ok" : ""}`} />
            </button>
          );
        })}
      </div>

      <div className="ck-subbody">{renderBody()}</div>
    </div>
  );
}

export default function ConsultaIndividual({ refreshKey = 0 }) {
  const [doc, setDoc] = useState("");
  const [idSequencia, setIdSequencia] = useState("");
  const [loading, setLoading] = useState(false);

  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("CSV");

  // ✅ REMOVIDO: REGRAS
  const tabs = useMemo(
    () => [
      { key: "CSV", label: "CSV" },
      { key: "KAPPI", label: "KAPPI" },
      { key: "ANALISE", label: "ANÁLISE" },
      { key: "RAW", label: "RAW" },
    ],
    []
  );

  async function consultar() {
    const docDigits = digitsOnly(doc);
    if (!docDigits) {
      setError("Digite um CPF/CNPJ válido.");
      setResp(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams();
      qs.set("doc", docDigits);
      if ((idSequencia || "").trim()) qs.set("id_sequencia", idSequencia.trim());

      const r = await fetch(`${API_BASE}/api/consulta_kappi?${qs.toString()}`);
      const j = await r.json();

      if (!j.ok) {
        setResp(null);
        setError(j.erro || "Erro ao consultar.");
      } else {
        setResp(j.data);
        setError(null);
        setTab("CSV");
        const inferred = j?.data?.meta?.id_sequencia;
        if (inferred && !(idSequencia || "").trim()) setIdSequencia(inferred);
      }
    } catch (e) {
      setResp(null);
      setError("Falha de rede/servidor ao consultar.");
    } finally {
      setLoading(false);
    }
  }

  const currentData = resp?.abas?.[tab];

  return (
    <section className="ck-wrap">
      <div className="ck-header">
        <div className="ck-title">Consulta individual (abas tipo “planilhas”)</div>
        <div className="ck-sub">Digite o documento e veja CSV / Kappi / Análise como abas.</div>

        <div className="ck-form">
          <div className="ck-field">
            <label>CPF/CNPJ (cnpjCpf)</label>
            <input value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="ex: 07505979337" />
          </div>

          <div className="ck-field">
            <label>id_sequencia (opcional, evita misturar lotes)</label>
            <input
              value={idSequencia}
              onChange={(e) => setIdSequencia(e.target.value)}
              placeholder="ex: ea88bd7d-2623-4ac6-8d48-a24b375eb85e"
            />
          </div>

          <button className="ck-btn" onClick={consultar} disabled={loading}>
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {error ? <div className="ck-error">{error}</div> : null}
      </div>

      {/* navbar superior (abas/planilhas) */}
      <div className="ck-tabs">
        {tabs.map((t) => {
          const active = t.key === tab;
          const hasData = resp?.abas?.[t.key] != null;
          return (
            <button
              key={t.key}
              className={`ck-tab ${active ? "is-active" : ""}`}
              onClick={() => setTab(t.key)}
              disabled={!resp}
              title={!hasData ? "Sem dados" : "Abrir"}
            >
              <span className="ck-tab__label">{t.label}</span>
              <span className={`ck-dot ${hasData ? "ok" : ""}`} />
            </button>
          );
        })}
      </div>

      {/* conteúdo */}
      <div className="ck-body">
        {!resp ? (
          <div className="ck-empty big">Faça uma consulta para carregar os dados.</div>
        ) : tab === "CSV" ? (
          <CsvInternalTabs csvObj={resp?.abas?.CSV} kappiObj={resp?.abas?.KAPPI} />
        ) : tab === "KAPPI" ? (
          <KappiInternalTabs kappiObj={resp?.abas?.KAPPI} />
        ) : tab === "RAW" ? (
          <pre className="ck-pre">{JSON.stringify(currentData, null, 2)}</pre>
        ) : (
          <KeyValueTable data={currentData} />
        )}
      </div>
    </section>
  );
}
