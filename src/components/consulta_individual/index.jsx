// src/components/consulta_individual/index.jsx
import React, { useMemo, useRef, useState } from "react";
import "./index.css";

// ✅ Exportar tela -> PDF
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ✅ IMPORTA O DASHBOARD REAL (o grandão que eu montei)
import SheetDashboard from "./SheetDashboard"; // ajuste o caminho se necessário

// ✅ componente de nova consulta (salva no Mongo via bulk_consult_save)
import NovaConsulta from "./nova_consulta";

// ✅ Ícones
import {
  UserRound,
  BarChart3,
  Scale,
  CreditCard,
  Leaf,
  BadgeCheck,
  ShieldX,
  Landmark,
  Vote,
  Fingerprint,
  Newspaper,
  Play,
  Plus,
  Download,
  X,
} from "lucide-react";

const API_BASE = "http://localhost:5502";

/* =========================
   Helper: normaliza (obj OU array[0])
========================= */
function extractFirst(v) {
  if (!v) return null;
  if (Array.isArray(v)) return v[0] || null;
  return v;
}

/* =========================
   Helpers: extração por collection
========================= */
function extractKappiFromMultiplas(data) {
  return extractFirst(data?.by_collection?.REPUTATIONAL) || null;
}
function extractSocioFromMultiplas(data) {
  return extractFirst(data?.by_collection?.SOCIO_ENVIRONMENTAL) || null;
}
function extractCreditFromMultiplas(data) {
  return extractFirst(data?.by_collection?.CREDIT) || null;
}
function extractProScoreFromMultiplas(data) {
  return extractFirst(data?.by_collection?.PRO_SCORE) || null;
}
function extractRegIntegrityFromMultiplas(data) {
  return extractFirst(data?.by_collection?.REGISTRATION_INTEGRITY) || null;
}

/* =========================
   Tradução e filtros (Frontend)
========================= */
const DROP_KEYS = new Set(["_cpf_relation", "_cnpj_relation", "_diligence_id", "_rev", "_key"]);

const TITLE_PT = {
  "ELECTORAL DONORS": "Doadores eleitorais",
  "FEDERAL REVENUE STATUS": "Situação na Receita Federal",
  "SANCTIONS AND RESTRICTIONS": "Sanções e restrições",
  "NEGATIVE MEDIA": "Mídia negativa",
  "LEGAL PROCESS": "Processos judiciais",
  "CRIMINAL BACKGROUND - FEDERAL POLICE": "Antecedentes criminais - Polícia Federal",
};

const TYPE_PT = {
  REPUTATIONAL: "Reputacional",
  "DATA INTEGRITY": "Integridade de dados",
  "LEGAL PROCESS": "Processos",
};

const PT_MAP = {
  _id: "ID (Mongo)",
  id: "ID",
  _meta: "Metadados",
  saved_at: "Salvo em",
  source: "Fonte",
  consult_type: "Tipo de consulta",
  document: "Documento",
  extra: "Extra",
  status: "Status",
  raw: "Bruto (raw)",
  diligence_id: "Diligence ID",

  createdAt: "Criado em",
  client: "Cliente",
  hasError: "Teve erro",
  steps: "Etapas",
  user: "Usuário",
  version: "Versão",
  relation: "Relações",
  total: "Totais",
  PJcount: "Qtd. PJ",
  PFcount: "Qtd. PF",
  PEcount: "Qtd. PE",
  nodes: "Nós",
  links: "Ligações",
  name: "Nome",
  _color: "Cor",

  entities: "Entidades",
  step: "Etapa (step)",
  cnpj: "CNPJ",
  cnpj_basico: "CNPJ (básico)",
  cpf: "CPF",
  razao_social: "Razão social",
  nome_fantasia: "Nome fantasia",
  capital_social: "Capital social",
  data_inicio_atividade: "Início da atividade",
  email: "E-mail",
  is_filial: "É filial",
  is_mei: "É MEI",
  opcao_simples: "Opção Simples",
  is_simples: "Optante do Simples",
  data_opcao_pelo_simples: "Data opção Simples",

  telefone: "Telefone(s)",
  telefone_1: "Telefone 1",
  telefone_2: "Telefone 2",

  porte: "Porte",
  qualificacao_do_responsavel: "Qualificação do responsável",
  natureza_juridica: "Natureza jurídica",
  situacao_cadastral: "Situação cadastral",
  motivo: "Motivo",
  codigo: "Código",
  descricao: "Descrição",
  data: "Data",

  cnae: "CNAE",
  main_economic_activity: "Atividade econômica principal",
  secondary_economic_activities: "Atividades econômicas secundárias",
  secondary_activity: "Atividade secundária",

  endereco: "Endereço",
  uf: "UF",
  numero: "Número",
  bairro: "Bairro",
  municipio: "Município",
  logradouro: "Logradouro",
  logradouro_completo: "Logradouro completo",
  cep: "CEP",
  endereco_completo: "Endereço completo",

  analyses: "Análises",
  title: "Título",
  type: "Tipo",
  ok: "OK",
  severity: "Severidade",
  query_date: "Data da consulta",

  totalizers_per_document: "Totalizadores (por documento)",
  alerts_per_documento: "Alertas (por documento)",
  others: "Outros",
  assets: "Ativos",
  liabilities: "Passivos",
  compliant: "Conforme",
  critical: "Crítico",
  medium: "Médio",
  case_lists_by_document: "Lista de processos",

  process_number: "Número do processo",
  process_url: "Link do processo",
  case_movements: "Movimentações",
  process_class: "Classe processual",
  process_status: "Status do processo",
  degree: "Instância",
  state: "UF",
  alert: "Alerta",
  claim_value: "Valor da causa",
  subjects: "Assuntos",
  jurisdiction: "Ramo / Jurisdição",

  election_donations: "Doações eleitorais",
  news_found: "Notícias encontradas",
};

function translateKey(key) {
  if (DROP_KEYS.has(key)) return null;
  const prettyFallback = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return PT_MAP[key] || prettyFallback;
}

function translateTitle(t) {
  const k = (t || "").toString().trim().toUpperCase();
  return TITLE_PT[k] || t || "Sem título";
}

function translateType(t) {
  const k = (t || "").toString().trim().toUpperCase();
  return TYPE_PT[k] || t || "—";
}

function formatValue(v) {
  if (v == null) return "Sem dados";
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "TRUE") return "Sim";
    if (t === "FALSE") return "Não";
    if (t === "0") return "Não";
    if (t === "1") return "Sim";
    return v;
  }
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}

function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

/* =========================
   Drawer (painel direito)
========================= */
function SideDrawer({ open, title, subtitle, onClose, children }) {
  if (!open) return null;

  return (
    <div className="ck-drawerRoot" role="dialog" aria-modal="true">
      <div className="ck-drawerOverlay" onClick={onClose} />
      <div className="ck-drawer">
        <div className="ck-drawerHead">
          <div className="ck-drawerHeadLeft">
            <div className="ck-drawerTitle">{title || "Detalhes"}</div>
            {subtitle ? <div className="ck-drawerSub">{subtitle}</div> : null}
          </div>
          <button className="ck-drawerClose" onClick={onClose} aria-label="Fechar" type="button">
            ✕
          </button>
        </div>

        <div className="ck-drawerBody">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Modal simples para NovaConsulta
========================= */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="ck-modalRoot" role="dialog" aria-modal="true">
      <div className="ck-modalOverlay" onClick={onClose} />
      <div className="ck-modal">
        <div className="ck-modalHead">
          <div className="ck-modalTitle">{title || "Nova consulta"}</div>
          <button className="ck-modalClose" onClick={onClose} aria-label="Fechar" type="button">
            ✕
          </button>
        </div>
        <div className="ck-modalBody">{children}</div>
      </div>
    </div>
  );
}

/* =========================
   Render genérico (com tradução)
========================= */
function KeyValueTable({ data }) {
  if (!data) return <div className="ck-empty">Sem dados</div>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <div className="ck-empty">Sem dados</div>;

    if (data.every((x) => isPlainObject(x))) {
      return (
        <div className="ck-list">
          {data.map((item, idx) => (
            <div key={idx} className="ck-card">
              <KeyValueTable data={item} />
            </div>
          ))}
        </div>
      );
    }

    return (
      <ul className="ck-ul">
        {data.map((x, i) => (
          <li key={i}>{formatValue(x)}</li>
        ))}
      </ul>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data)
      .map(([k, v]) => {
        const tk = translateKey(k);
        return tk ? [k, tk, v] : null;
      })
      .filter(Boolean);

    if (entries.length === 0) return <div className="ck-empty">Sem dados</div>;

    return (
      <table className="ck-table">
        <thead>
          <tr>
            <th className="ck-colCampo">Campo</th>
            <th>Valor</th>
          </tr>
        </thead>

        <tbody>
          {entries.map(([origK, ptK, v]) => (
            <tr key={origK}>
              <td className="ck-k">{ptK}</td>
              <td className="ck-v">
                {isPlainObject(v) || Array.isArray(v) ? (
                  <div className="ck-inlineObj">
                    <KeyValueTable data={v} />
                  </div>
                ) : (
                  <span>{formatValue(v)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return <div className="ck-empty">{formatValue(data)}</div>;
}

/* =========================
   REPUTATIONAL helpers
========================= */
function normalizeTitle(t) {
  return (t || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
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

/* =========================
   Fingerprint vermelho se status == INDETERMINADO
========================= */
function findStatusDeep(obj, maxDepth = 4) {
  const seen = new Set();

  function walk(v, depth) {
    if (v == null) return null;
    if (depth > maxDepth) return null;

    if (typeof v === "string") return null;
    if (typeof v !== "object") return null;

    if (seen.has(v)) return null;
    seen.add(v);

    if (Object.prototype.hasOwnProperty.call(v, "status")) {
      const s = v.status;
      if (typeof s === "string") return s;
      if (s != null) return String(s);
    }

    for (const k of ["result", "state"]) {
      if (Object.prototype.hasOwnProperty.call(v, k)) {
        const s = v[k];
        if (typeof s === "string") return s;
        if (s != null) return String(s);
      }
    }

    if (Array.isArray(v)) {
      for (const it of v) {
        const out = walk(it, depth + 1);
        if (out) return out;
      }
      return null;
    }

    for (const key of Object.keys(v)) {
      const out = walk(v[key], depth + 1);
      if (out) return out;
    }
    return null;
  }

  return walk(obj, 0);
}

function isIndeterminadoStatus(analysisData) {
  const s = (findStatusDeep(analysisData) || "").toString().trim().toUpperCase();
  return s === "INDETERMINADO";
}

/* =========================
   Helpers: "tem dado?"
========================= */
function hasUsefulRawBlock(obj) {
  const raw = obj?.extra?.raw || null;
  if (!raw || typeof raw !== "object") return false;
  const analyses = Array.isArray(raw?.analyses) ? raw.analyses : [];
  if (analyses.length > 0) return true;
  return Object.keys(raw).length > 0;
}

function hasTabData({ kappiObj, socioObj, creditObj, proScoreObj, regObj }, tabKey) {
  const kRaw = getKappiRaw(kappiObj);
  const kAnalyses = getKappiAnalyses(kappiObj);

  if (tabKey === "DASHBOARD") return true;

  if (tabKey === "DADOS") {
    const ents = Array.isArray(kRaw?.entities) ? kRaw.entities : [];
    return ents.length > 0;
  }

  if (tabKey === "ANALISES") {
    const list = kAnalyses
      .map((a) => a?.data)
      .filter(Boolean)
      .filter((d) => normalizeTitle(d.title) !== "LEGAL PROCESS");
    return list.length > 0;
  }

  if (tabKey === "PROCESSOS") {
    const legal = pickAnalysisByTitle(kAnalyses, "LEGAL PROCESS");
    const cases = Array.isArray(legal?.case_lists_by_document) ? legal.case_lists_by_document : [];
    return cases.length > 0;
  }

  if (tabKey === "AMBIENTAL") return hasUsefulRawBlock(socioObj);
  if (tabKey === "CREDITO") return hasUsefulRawBlock(creditObj) || hasUsefulRawBlock(proScoreObj);
  if (tabKey === "INTEGRIDADE") return hasUsefulRawBlock(regObj);

  return false;
}

/* =========================
   Sheets básicos
========================= */
function SheetDadosPessoais({ kappiObj }) {
  const raw = getKappiRaw(kappiObj);
  if (!raw) return <div className="ck-empty">Sem dados</div>;

  return (
    <div className="ck-section">
      <div className="ck-section__title">Dados pessoais</div>
      <KeyValueTable data={raw.entities || null} />
    </div>
  );
}

/* =========================
   Análises (REPUTATIONAL)
========================= */
function analysisIconFor(title) {
  const t = normalizeTitle(title);

  if (t === "SANCTIONS AND RESTRICTIONS") return ShieldX;
  if (t === "FEDERAL REVENUE STATUS") return Landmark;
  if (t === "ELECTORAL DONORS") return Vote;
  if (t === "CRIMINAL BACKGROUND - FEDERAL POLICE") return Fingerprint;
  if (t === "NEGATIVE MEDIA") return Newspaper;

  return BarChart3;
}

function SheetAnalises({ kappiObj, onOpenDrawer }) {
  const analyses = getKappiAnalyses(kappiObj);

  const analysesFiltered = analyses.filter((a) => normalizeTitle(a?.data?.title) !== "LEGAL PROCESS");
  if (!analysesFiltered.length) return <div className="ck-empty">Sem dados</div>;

  const cards = analysesFiltered
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
      };

      return { idx, head, data };
    })
    .filter(Boolean);

  return (
    <div className="ck-section">
      <div className="ck-section__title">Análises</div>

      <div className="ck-list">
        {cards.map(({ idx, head, data }) => {
          const Icon = analysisIconFor(head.title);

          const isCriminal = normalizeTitle(head.title) === "CRIMINAL BACKGROUND - FEDERAL POLICE";
          const iconIsRed = isCriminal && isIndeterminadoStatus(data);

          return (
            <div className="ck-card" key={idx}>
              <div className="ck-card__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon
                  size={20}
                  style={{
                    flex: "0 0 auto",
                    color: iconIsRed ? "#d11a2a" : undefined,
                  }}
                />
                <span>{translateTitle(head.title || `Análise ${idx + 1}`)}</span>
              </div>

              <div className="ck-mini">
                <span className="ck-pill">
                  <b>Severidade:</b> {head.severity ?? "—"}
                </span>
                <span className="ck-pill">
                  <b>OK:</b> {head.ok == null ? "—" : formatValue(head.ok)}
                </span>
                <span className="ck-pill">
                  <b>Tipo:</b> {translateType(head.type) || "—"}
                </span>
              </div>

              <button
                className="ck-detailsBtn"
                type="button"
                onClick={() =>
                  onOpenDrawer({
                    title: translateTitle(head.title || `Análise ${idx + 1}`),
                    subtitle: `Severidade: ${head.severity ?? "—"} • OK: ${
                      head.ok == null ? "—" : formatValue(head.ok)
                    } • Tipo: ${translateType(head.type) || "—"}`,
                    payload: data,
                  })
                }
              >
                <span className="ck-detailsBtn__icon">
                  <Play size={14} />
                </span>
                Ver detalhes
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   SOCIO_ENVIRONMENTAL -> Aba Ambiental
========================= */
function SheetAmbiental({ socioObj, onOpenDrawer }) {
  const raw = socioObj?.extra?.raw || null;
  const analyses = Array.isArray(raw?.analyses) ? raw.analyses : [];

  if (!raw || (!analyses.length && Object.keys(raw).length === 0)) return <div className="ck-empty">Sem dados</div>;

  if (!analyses.length) {
    return (
      <div className="ck-section">
        <div className="ck-section__title">Ambiental (SOCIO_ENVIRONMENTAL)</div>
        <KeyValueTable data={raw} />
      </div>
    );
  }

  const cards = analyses
    .map((a, idx) => {
      const data = a?.data;
      if (!isPlainObject(data)) return null;

      const head = {
        analysis_id: data?.id ?? a?.id,
        title: data?.title || "SOCIO_ENVIRONMENTAL",
        type: data?.type,
        severity: data?.severity,
        ok: data?.ok,
        query_date: data?.query_date,
      };

      return { idx, head, data };
    })
    .filter(Boolean);

  return (
    <div className="ck-section">
      <div className="ck-section__title">Ambiental (SOCIO_ENVIRONMENTAL)</div>

      <div className="ck-list">
        {cards.map(({ idx, head, data }) => (
          <div className="ck-card" key={idx}>
            <div className="ck-card__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Leaf size={20} style={{ flex: "0 0 auto" }} />
              <span>{head.title || `Análise ${idx + 1}`}</span>
            </div>

            <div className="ck-mini">
              <span className="ck-pill">
                <b>Severidade:</b> {head.severity ?? "—"}
              </span>
              <span className="ck-pill">
                <b>OK:</b> {head.ok == null ? "—" : formatValue(head.ok)}
              </span>
              <span className="ck-pill">
                <b>Tipo:</b> {translateType(head.type) || "—"}
              </span>
            </div>

            <button
              className="ck-detailsBtn"
              type="button"
              onClick={() =>
                onOpenDrawer({
                  title: head.title || `Análise ${idx + 1}`,
                  subtitle: `SOCIO_ENVIRONMENTAL • Severidade: ${head.severity ?? "—"} • OK: ${
                    head.ok == null ? "—" : formatValue(head.ok)
                  }`,
                  payload: data,
                })
              }
            >
              <span className="ck-detailsBtn__icon">
                <Play size={14} />
              </span>
              Ver detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Bloco reutilizável: analyses OU fallback raw
========================= */
function GenericAnalysesBlock({ title, IconComp, obj, defaultTitle, subtitlePrefix, onOpenDrawer }) {
  const raw = obj?.extra?.raw || null;
  const analyses = Array.isArray(raw?.analyses) ? raw.analyses : [];

  if (!raw || (!analyses.length && Object.keys(raw).length === 0)) {
    return (
      <div className="ck-section">
        <div className="ck-section__title">{title}</div>
        <div className="ck-empty">Sem dados</div>
      </div>
    );
  }

  if (!analyses.length) {
    return (
      <div className="ck-section">
        <div className="ck-section__title">{title}</div>
        <KeyValueTable data={raw} />
      </div>
    );
  }

  const cards = analyses
    .map((a, idx) => {
      const data = a?.data;
      if (!isPlainObject(data)) return null;

      const head = {
        analysis_id: data?.id ?? a?.id,
        title: data?.title || defaultTitle,
        type: data?.type,
        severity: data?.severity,
        ok: data?.ok,
        query_date: data?.query_date,
      };

      return { idx, head, data };
    })
    .filter(Boolean);

  return (
    <div className="ck-section">
      <div className="ck-section__title">{title}</div>

      <div className="ck-list">
        {cards.map(({ idx, head, data }) => (
          <div className="ck-card" key={idx}>
            <div className="ck-card__title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconComp size={20} style={{ flex: "0 0 auto" }} />
              <span>{head.title || `Análise ${idx + 1}`}</span>
            </div>

            <div className="ck-mini">
              <span className="ck-pill">
                <b>Severidade:</b> {head.severity ?? "—"}
              </span>
              <span className="ck-pill">
                <b>OK:</b> {head.ok == null ? "—" : formatValue(head.ok)}
              </span>
              <span className="ck-pill">
                <b>Tipo:</b> {translateType(head.type) || "—"}
              </span>
            </div>

            <button
              className="ck-detailsBtn"
              type="button"
              onClick={() =>
                onOpenDrawer({
                  title: head.title || `Análise ${idx + 1}`,
                  subtitle: `${subtitlePrefix} • Severidade: ${head.severity ?? "—"} • OK: ${
                    head.ok == null ? "—" : formatValue(head.ok)
                  }`,
                  payload: data,
                })
              }
            >
              <span className="ck-detailsBtn__icon">
                <Play size={14} />
              </span>
              Ver detalhes
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   CREDIT + PRO_SCORE -> Aba Crédito
========================= */
function SheetCredito({ creditObj, proScoreObj, onOpenDrawer }) {
  const hasAny = hasUsefulRawBlock(creditObj) || hasUsefulRawBlock(proScoreObj);
  if (!hasAny) return <div className="ck-empty">Sem dados</div>;

  return (
    <div className="ck-section">
      <div className="ck-section__title">Crédito</div>

      <div className="ck-grid2">
        <GenericAnalysesBlock
          title="Crédito (CREDIT)"
          IconComp={CreditCard}
          obj={creditObj}
          defaultTitle="CREDIT"
          subtitlePrefix="CREDIT"
          onOpenDrawer={onOpenDrawer}
        />

        <GenericAnalysesBlock
          title="Score (PRO_SCORE)"
          IconComp={BarChart3}
          obj={proScoreObj}
          defaultTitle="PRO_SCORE"
          subtitlePrefix="PRO_SCORE"
          onOpenDrawer={onOpenDrawer}
        />
      </div>
    </div>
  );
}

/* =========================
   REGISTRATION_INTEGRITY
========================= */
function SheetIntegridade({ regObj, onOpenDrawer }) {
  return (
    <GenericAnalysesBlock
      title="Integridade Cadastral (REGISTRATION_INTEGRITY)"
      IconComp={BadgeCheck}
      obj={regObj}
      defaultTitle="REGISTRATION_INTEGRITY"
      subtitlePrefix="REGISTRATION_INTEGRITY"
      onOpenDrawer={onOpenDrawer}
    />
  );
}

/* =========================
   Processos (REPUTATIONAL) + FILTROS
========================= */
function SheetProcessos({ kappiObj }) {
  const analyses = getKappiAnalyses(kappiObj);
  if (!analyses.length) return <div className="ck-empty">Sem dados</div>;

  const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
  if (!legal) return <div className="ck-empty">Sem dados</div>;

  const cases = Array.isArray(legal.case_lists_by_document) ? legal.case_lists_by_document : [];
  if (!cases.length) return <div className="ck-empty">Sem dados</div>;

  const [qNumero, setQNumero] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fJur, setFJur] = useState("");
  const [fTipo, setFTipo] = useState("");

  const { statusOptions, jurOptions, typeOptions } = useMemo(() => {
    const uniq = (arr) =>
      Array.from(
        new Set(
          arr
            .map((x) => (x == null ? "" : String(x).trim()))
            .filter((x) => x.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return {
      statusOptions: uniq(cases.map((c) => c?.process_status)),
      jurOptions: uniq(cases.map((c) => c?.jurisdiction)),
      typeOptions: uniq(cases.map((c) => c?.type)),
    };
  }, [cases]);

  const casesFiltered = useMemo(() => {
    const q = digitsOnly(qNumero);
    const s = (fStatus || "").trim();
    const j = (fJur || "").trim();
    const tp = (fTipo || "").trim();

    return cases.filter((c) => {
      if (q) {
        const p = digitsOnly(c?.process_number);
        if (!p.includes(q)) return false;
      }
      if (s) {
        const v = (c?.process_status == null ? "" : String(c.process_status).trim());
        if (v !== s) return false;
      }
      if (j) {
        const v = (c?.jurisdiction == null ? "" : String(c.jurisdiction).trim());
        if (v !== j) return false;
      }
      if (tp) {
        const v = (c?.type == null ? "" : String(c.type).trim());
        if (v !== tp) return false;
      }
      return true;
    });
  }, [cases, qNumero, fStatus, fJur, fTipo]);

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

  function limparFiltros() {
    setQNumero("");
    setFStatus("");
    setFJur("");
    setFTipo("");
  }

  return (
    <div className="ck-section">
      <div className="ck-section__title">Processos</div>

      <div className="ck-filters">
        <div className="ck-field">
          <label>Pesquisar por número do processo</label>
          <div className="ck-inputWrap">
            <input value={qNumero} onChange={(e) => setQNumero(e.target.value)} placeholder="ex: 0001234-56..." />
          </div>
        </div>

        <div className="ck-field">
          <label>Status do processo</label>
          <div className="ck-inputWrap">
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">Todos</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ck-field">
          <label>Ramo / Jurisdição</label>
          <div className="ck-inputWrap">
            <select value={fJur} onChange={(e) => setFJur(e.target.value)}>
              <option value="">Todos</option>
              {jurOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ck-field">
          <label>Tipo</label>
          <div className="ck-inputWrap">
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
              <option value="">Todos</option>
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button className="ck-btn ck-btn--ghost" type="button" onClick={limparFiltros}>
          Limpar
        </button>

        <span className="ck-countPill" title="Quantidade exibida">
          <b>Exibindo:</b> {casesFiltered.length} / {cases.length}
        </span>
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
            {casesFiltered.map((c, i) => (
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

            {!casesFiltered.length ? (
              <tr>
                <td colSpan={headers.length} style={{ padding: "14px 12px" }}>
                  <div className="ck-empty">Nenhum processo encontrado com esses filtros.</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================
   NAV-BAR (com bolinha + ícone)
========================= */
function KappiNavbar({ current, setCurrent, kappiObj, socioObj, creditObj, proScoreObj, regObj }) {
  const items = useMemo(
    () => [
      { key: "DASHBOARD", label: "Dashboard", Icon: BarChart3 },
      { key: "DADOS", label: "Dados pessoais", Icon: UserRound },
      { key: "ANALISES", label: "Análises", Icon: BarChart3 },
      { key: "PROCESSOS", label: "Processos", Icon: Scale },
      { key: "CREDITO", label: "Crédito", Icon: CreditCard },
      { key: "AMBIENTAL", label: "Ambiental", Icon: Leaf },
      { key: "INTEGRIDADE", label: "Integridade Cadastral", Icon: BadgeCheck },
    ],
    []
  );

  return (
    <div className="ck-tabs ck-tabs--single">
      {items.map((it) => {
        const hasData = hasTabData({ kappiObj, socioObj, creditObj, proScoreObj, regObj }, it.key);
        const Icon = it.Icon;

        return (
          <button
            key={it.key}
            className={`ck-tab ${current === it.key ? "is-active" : ""}`}
            onClick={() => setCurrent(it.key)}
            type="button"
          >
            <span className={`ck-tabDot ${hasData ? "is-full" : "is-empty"}`} />
            <span className="ck-tab__label" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon size={16} />
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* =========================
   ✅ GUIAS (multi-consultas) — igual a imagem
========================= */
function MultiTabsBar({ sessions, activeId, onSelect, onClose }) {
  return (
    <div className="ck-mtabs">
      <div className="ck-mtabsLabel">Painel</div>

      <div className="ck-mtabsList">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`ck-mtab ${s.id === activeId ? "is-active" : ""}`}
            onClick={() => onSelect(s.id)}
            title={s.doc}
          >
            <span className="ck-mtabText">{s.doc}</span>

            <span
              className="ck-mtabClose"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose(s.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(s.id);
                }
              }}
              aria-label={`Fechar guia ${s.doc}`}
              title="Fechar"
            >
              <X size={14} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Página principal (multi-sessões)
========================= */
export default function ConsultaIndividual({ refreshKey = 0 }) {
  // input livre pra digitar o próximo doc
  const [doc, setDoc] = useState("");

  // ✅ sessões (cada guia)
  const [sessions, setSessions] = useState([]); // [{id, doc, loading, error, tab, kappi, socioEnv, creditObj, proScoreObj, regIntegrityObj}]
  const [activeId, setActiveId] = useState(null);

  // drawer global
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerSubtitle, setDrawerSubtitle] = useState("");
  const [drawerPayload, setDrawerPayload] = useState(null);

  // modal nova consulta
  const [novaOpen, setNovaOpen] = useState(false);

  // export PDF do dashboard (da guia ativa)
  const dashboardRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const active = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId]);

  function openDrawer({ title, subtitle, payload }) {
    setDrawerTitle(title || "Detalhes");
    setDrawerSubtitle(subtitle || "");
    setDrawerPayload(payload || null);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setDrawerTitle("");
    setDrawerSubtitle("");
    setDrawerPayload(null);
  }

  // cria uma sessão vazia
  function makeSession(docDigits) {
    return {
      id: `${docDigits}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      doc: docDigits,
      loading: false,
      error: null,
      tab: "DASHBOARD",
      kappi: null,
      socioEnv: null,
      creditObj: null,
      proScoreObj: null,
      regIntegrityObj: null,
    };
  }

  function setSession(id, patch) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function findSessionByDoc(docDigits) {
    return sessions.find((s) => s.doc === docDigits) || null;
  }

  function ensureSession(docDigits) {
    const existing = findSessionByDoc(docDigits);
    if (existing) {
      setActiveId(existing.id);
      return existing.id;
    }
    const created = makeSession(docDigits);
    setSessions((prev) => [...prev, created]);
    setActiveId(created.id);
    return created.id;
  }

  function selectSession(id) {
    setActiveId(id);
    closeDrawer();
    const s = sessions.find((x) => x.id === id);
    if (s) setDoc(s.doc);
  }

  function closeSession(id) {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;

      const next = prev.filter((s) => s.id !== id);

      // se fechou a ativa, escolhe uma vizinha
      if (activeId === id) {
        const candidate = next[idx] || next[idx - 1] || null;
        setActiveId(candidate ? candidate.id : null);
        setDoc(candidate ? candidate.doc : "");
        closeDrawer();
      }

      return next;
    });
  }

  async function consultar(docOverride) {
    const docDigits = digitsOnly(docOverride ?? doc);
    if (!docDigits) return;

    const sid = ensureSession(docDigits);
    setDoc(docDigits);
    closeDrawer();

    // marca loading só na sessão alvo
    setSession(sid, { loading: true, error: null });

    try {
      const qs = new URLSearchParams();
      qs.set("doc", docDigits);

      const r = await fetch(`${API_BASE}/api/consultas_multiplas?${qs.toString()}`);
      const j = await r.json();

      if (!j.ok) {
        setSession(sid, {
          loading: false,
          error: j.erro || "Erro ao consultar.",
          kappi: null,
          socioEnv: null,
          creditObj: null,
          proScoreObj: null,
          regIntegrityObj: null,
        });
        return;
      }

      const rep = extractKappiFromMultiplas(j);
      const socio = extractSocioFromMultiplas(j);
      const credit = extractCreditFromMultiplas(j);
      const proScore = extractProScoreFromMultiplas(j);
      const reg = extractRegIntegrityFromMultiplas(j);

      // define tab default se não vier REPUTATIONAL
      let nextTab = "DASHBOARD";
      let nextErr = null;
      let nextKappi = rep || null;

      if (!rep) {
        nextErr = "Sem dados de KAPPI (REPUTATIONAL) para este documento.";
        if (credit || proScore) nextTab = "CREDITO";
        else if (reg) nextTab = "INTEGRIDADE";
        else if (socio) nextTab = "AMBIENTAL";
        else nextTab = "DASHBOARD";
      }

      setSession(sid, {
        loading: false,
        error: nextErr,
        tab: nextTab,
        kappi: nextKappi,
        socioEnv: socio || null,
        creditObj: credit || null,
        proScoreObj: proScore || null,
        regIntegrityObj: reg || null,
      });
    } catch (e) {
      setSession(sid, {
        loading: false,
        error: "Falha de rede/servidor ao consultar.",
        kappi: null,
        socioEnv: null,
        creditObj: null,
        proScoreObj: null,
        regIntegrityObj: null,
      });
    }
  }

  async function baixarRelatorioDashboardPdf() {
    try {
      if (!active) return;
      if (!active.kappi) return; // só libera com kappi
      if (active.tab !== "DASHBOARD") return;

      const el = dashboardRef.current;
      if (!el) return;

      setExporting(true);
      await new Promise((r) => setTimeout(r, 120));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: document.documentElement.clientWidth,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `relatorio_dashboard_${active.doc}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.pdf`;

      pdf.save(fileName);
    } finally {
      setExporting(false);
    }
  }

  // render do corpo baseado na guia ativa
  const renderBody = () => {
    if (!active) return <div className="ck-empty big">Faça uma consulta para abrir uma guia.</div>;

    const { kappi, socioEnv, creditObj, proScoreObj, regIntegrityObj, tab } = active;

    if (!kappi && !socioEnv && !creditObj && !proScoreObj && !regIntegrityObj) {
      return <div className="ck-empty big">Sem dados nesta guia (faça a consulta).</div>;
    }

    if (tab === "DASHBOARD")
      return kappi ? (
        <SheetDashboard
          kappiObj={kappi}
          creditObj={creditObj}
          proScoreObj={proScoreObj}
          regObj={regIntegrityObj}
          regIntegrityObj={regIntegrityObj}
        />
      ) : (
        <div className="ck-empty">Sem dados</div>
      );

    if (tab === "DADOS") return kappi ? <SheetDadosPessoais kappiObj={kappi} /> : <div className="ck-empty">Sem dados</div>;

    if (tab === "ANALISES")
      return kappi ? <SheetAnalises kappiObj={kappi} onOpenDrawer={openDrawer} /> : <div className="ck-empty">Sem dados</div>;

    if (tab === "PROCESSOS") return kappi ? <SheetProcessos kappiObj={kappi} /> : <div className="ck-empty">Sem dados</div>;

    if (tab === "AMBIENTAL") return <SheetAmbiental socioObj={socioEnv} onOpenDrawer={openDrawer} />;

    if (tab === "CREDITO") return <SheetCredito creditObj={creditObj} proScoreObj={proScoreObj} onOpenDrawer={openDrawer} />;

    if (tab === "INTEGRIDADE") return <SheetIntegridade regObj={regIntegrityObj} onOpenDrawer={openDrawer} />;

    return <div className="ck-empty">Sem dados</div>;
  };

  return (
    <section className="ck-wrap">
      {/* ✅ GUIAS */}
      <MultiTabsBar
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSession}
        onClose={closeSession}
      />

      {/* HEADER */}
      <div className="ck-header">
        <div className="ck-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>Consulta Multiplas (KAPPI + Ambiental + Crédito + Integridade)</span>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {/* PDF do dashboard da guia ativa */}
            <button
              className="ck-btn ck-btn--ghost"
              type="button"
              onClick={baixarRelatorioDashboardPdf}
              disabled={!active || exporting || active?.loading || active?.tab !== "DASHBOARD" || !active?.kappi}
              title={
                !active
                  ? "Abra uma guia primeiro"
                  : !active.kappi
                  ? "Faça uma consulta com dados de KAPPI para liberar"
                  : active.tab !== "DASHBOARD"
                  ? "Vá para a aba Dashboard para baixar"
                  : "Baixar relatório em PDF"
              }
              aria-label="Baixar relatório"
            >
              <Download size={16} />
              {exporting ? "Gerando PDF..." : "Baixar relatório"}
            </button>

            {/* Nova consulta (Mongo) */}
            <button
              className="ck-btn ck-btn--plus"
              type="button"
              onClick={() => setNovaOpen(true)}
              title="Nova consulta"
              aria-label="Nova consulta"
            >
              <Plus size={16} />
              Nova
            </button>
          </div>
        </div>

        <div className="ck-sub">
          Endpoint: /api/consultas_multiplas • Cada CPF/CNPJ vira uma guia (multi-consultas).
        </div>

        <div className="ck-form">
          <div className="ck-field">
            <label>CPF/CNPJ</label>
            <input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="ex: 06006506000194"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  consultar();
                }
              }}
            />
          </div>

          <button className="ck-btn" onClick={() => consultar()} disabled={active?.loading}>
            {active?.loading ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {/* erro da guia ativa */}
        {active?.error ? <div className="ck-error">{active.error}</div> : null}
      </div>

      {/* NAVBAR INTERNA (por guia) */}
      <KappiNavbar
        current={active?.tab || "DASHBOARD"}
        setCurrent={(next) => {
          if (!active) return;
          setSession(active.id, { tab: next });
          closeDrawer();
        }}
        kappiObj={active?.kappi || null}
        socioObj={active?.socioEnv || null}
        creditObj={active?.creditObj || null}
        proScoreObj={active?.proScoreObj || null}
        regObj={active?.regIntegrityObj || null}
      />

      {/* BODY (captura PDF só quando estiver no dashboard) */}
      <div className="ck-body">
        {active?.tab === "DASHBOARD" ? <div ref={dashboardRef}>{renderBody()}</div> : renderBody()}
      </div>

      <SideDrawer open={drawerOpen} title={drawerTitle} subtitle={drawerSubtitle} onClose={closeDrawer}>
        <KeyValueTable data={drawerPayload} />
      </SideDrawer>

      <Modal open={novaOpen} title="Nova consulta (salvar no Mongo)" onClose={() => setNovaOpen(false)}>
        <NovaConsulta
          backendBase={API_BASE}
          onClose={() => setNovaOpen(false)}
          onDone={({ docDigits }) => {
            setDoc(docDigits);
            setNovaOpen(false);
            consultar(docDigits); // ✅ cria/seleciona guia e carrega
          }}
        />
      </Modal>
    </section>
  );
}
