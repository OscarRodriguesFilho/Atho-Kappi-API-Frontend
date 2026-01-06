import React, { useMemo, useState } from "react";
import { getKappiRaw, pickAnalysisByTitle, getKappiAnalyses } from "../utils/kappi";

/* =========================
   Utils locais (Dashboard)
========================= */
function formatBRL(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function truncateWithEllipsis(text, maxLen = 17) {
  const s = (text || "").toString().trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "...";
}

function parseMoneyToNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return isFinite(v) ? v : 0;

  const s = String(v).trim();
  if (!s) return 0;

  const cleaned = s
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const num = Number(cleaned);
  return isFinite(num) ? num : 0;
}

/* =========================
   Mini gráficos (sem libs)
========================= */
function AreaLineChart({ title, items }) {
  const w = 640;
  const h = 260;
  const padL = 54;
  const padR = 18;
  const padT = 28;
  const padB = 44;

  const values = items.map((x) => Number(x.value || 0));
  const labels = items.map((x) => String(x.label));

  const maxRaw = Math.max(1, ...values);
  const step = 4;
  const max = Math.ceil(maxRaw / step) * step;

  const iw = w - padL - padR;
  const ih = h - padT - padB;

  const xFor = (i) => padL + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
  const yFor = (v) => padT + ih - (ih * v) / max;

  const pts = values.map((v, i) => [xFor(i), yFor(v)]);
  const lineD =
    pts.length === 0
      ? ""
      : `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ");

  const areaD =
    pts.length === 0
      ? ""
      : `M ${pts[0][0]} ${padT + ih} L ${pts[0][0]} ${pts[0][1]} ` +
        pts.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
        ` L ${pts[pts.length - 1][0]} ${padT + ih} Z`;

  const autoTicks = (() => {
    const n = 6;
    const s = Math.max(1, Math.ceil(max / (n - 1)));
    const ticks = [];
    for (let i = 0; i < n; i++) ticks.push(i * s);
    ticks[ticks.length - 1] = max;
    return ticks;
  })();

  return (
    <div className="ck-chart ck-chart--area">
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
      </div>

      <div className="ck-areaWrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="ck-areaSvg" role="img" aria-label={title}>
          {autoTicks.map((t) => {
            const y = yFor(t);
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={w - padR} y2={y} className="ck-areaGrid" />
                <text x={padL - 12} y={y + 4} textAnchor="end" className="ck-areaTick">
                  {t}
                </text>
              </g>
            );
          })}

          <path d={areaD} className="ck-areaFill" />
          <path d={lineD} className="ck-areaLine" />
          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} className="ck-areaDot" />
          ))}

          {labels.map((lab, i) => (
            <text key={lab + i} x={xFor(i)} y={h - 18} textAnchor="middle" className="ck-areaX">
              {lab}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function VerticalGroupedBars({ title, subtitle, items }) {
  const max = Math.max(
    1,
    ...items.flatMap((it) => [Number(it.passive || 0), Number(it.active || 0)])
  );

  return (
    <div className="ck-chart ck-chart--vbars">
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
        {subtitle ? <div className="ck-chart__sub">{subtitle}</div> : null}
      </div>

      <div className="ck-vbars">
        {items.map((it, idx) => {
          const p = Number(it.passive || 0);
          const a = Number(it.active || 0);
          const pH = Math.max(0, Math.min(100, (p / max) * 100));
          const aH = Math.max(0, Math.min(100, (a / max) * 100));

          const fullLabel = it.label || "";
          const shortLabel = truncateWithEllipsis(fullLabel, 17);

          return (
            <div className="ck-vbarCol" key={idx}>
              <div className="ck-vbarBars">
                <div className="ck-vbarStack">
                  <div className="ck-vbar is-red" style={{ height: `${pH}%` }} title={formatBRL(p)} />
                  <div className="ck-vbar is-green" style={{ height: `${aH}%` }} title={formatBRL(a)} />
                </div>
              </div>

              <div className="ck-vbarLabel" title={fullLabel}>
                {shortLabel}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ck-legend">
        <span className="ck-legendItem">
          <span className="ck-dot is-red" /> Passivo (deve)
        </span>
        <span className="ck-legendItem">
          <span className="ck-dot is-green" /> Ativo (a receber)
        </span>
      </div>
    </div>
  );
}

/* =========================
   Patrimônio vs tempo (com projeção)
========================= */
function stableHashNumber(str) {
  const s = (str || "").toString();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function fakeFipeValue(vehicleName) {
  const h = stableHashNumber(vehicleName);
  const base = 28_000 + (h % 392_000);
  return Math.round(base / 500) * 500;
}

function fakeImovelValue(tipo, local) {
  const h = stableHashNumber(`${tipo}::${local}`);
  const base = 380_000 + (h % 6_120_000);
  return Math.round(base / 10_000) * 10_000;
}

function computePatrimonioSeries({ startYear, endYear, projectionYears, societarias, imoveis, veiculos }) {
  const endProjected = Number(endYear) + Number(projectionYears || 0);

  const years = [];
  for (let y = Number(startYear); y <= Number(endProjected); y++) years.push(String(y));

  const baseSoc = societarias.reduce((acc, s) => acc + (Number(s.proportionalValue) || 0), 0);
  const baseImo = imoveis.reduce((acc, i) => acc + (Number(i.estimatedValue) || 0), 0);
  const baseVei = veiculos.reduce((acc, v) => acc + (Number(v.fipeValue) || 0), 0);

  const series = years.map((year, idx) => {
    const t = idx;
    const soc = baseSoc * Math.pow(1.08, t);
    const imo = baseImo * Math.pow(1.06, t);
    const vei = baseVei * Math.pow(0.91, t);
    const total = soc + imo + vei;
    return { label: year, value: total, breakdown: { soc, imo, vei } };
  });

  return { series, base: { baseSoc, baseImo, baseVei }, endProjected };
}

function PatrimonioChart({ title, items, cutYear }) {
  const w = 720;
  const h = 280;
  const padL = 74;
  const padR = 18;
  const padT = 28;
  const padB = 44;

  const values = items.map((x) => Number(x.value || 0));
  const labels = items.map((x) => String(x.label));

  const maxRaw = Math.max(1, ...values);
  const max = Math.ceil(maxRaw / 1_000_000) * 1_000_000;

  const iw = w - padL - padR;
  const ih = h - padT - padB;

  const xFor = (i) => padL + (labels.length === 1 ? iw / 2 : (iw * i) / (labels.length - 1));
  const yFor = (v) => padT + ih - (ih * v) / max;

  const pts = values.map((v, i) => [xFor(i), yFor(v)]);
  const lineD =
    pts.length === 0
      ? ""
      : `M ${pts[0][0]} ${pts[0][1]} ` + pts.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ");

  const areaD =
    pts.length === 0
      ? ""
      : `M ${pts[0][0]} ${padT + ih} L ${pts[0][0]} ${pts[0][1]} ` +
        pts.slice(1).map((p) => `L ${p[0]} ${p[1]}`).join(" ") +
        ` L ${pts[pts.length - 1][0]} ${padT + ih} Z`;

  const ticks = (() => {
    const n = 6;
    const step = max / (n - 1);
    const out = [];
    for (let i = 0; i < n; i++) out.push(Math.round(i * step));
    out[out.length - 1] = max;
    return out;
  })();

  const tickLabel = (v) => {
    const m = v / 1_000_000;
    if (m >= 1) return `${m.toFixed(0)}M`;
    const k = v / 1_000;
    if (k >= 1) return `${k.toFixed(0)}k`;
    return String(v);
  };

  const cutX = cutYear && labels.includes(String(cutYear)) ? xFor(labels.indexOf(String(cutYear))) : null;

  return (
    <div className="ck-chart ck-chart--area ck-chart--patrimonio">
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
        <div className="ck-chart__sub">Linha tracejada = início da projeção (após {cutYear})</div>
      </div>

      <div className="ck-areaWrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="ck-areaSvg" role="img" aria-label={title}>
          {ticks.map((t) => {
            const y = yFor(t);
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={w - padR} y2={y} className="ck-areaGrid" />
                <text x={padL - 12} y={y + 4} textAnchor="end" className="ck-areaTick">
                  {tickLabel(t)}
                </text>
              </g>
            );
          })}

          <path d={areaD} className="ck-areaFill" />
          <path d={lineD} className="ck-areaLine" />

          {pts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} className="ck-areaDot" />
          ))}

          {cutX != null ? <line x1={cutX} y1={padT} x2={cutX} y2={padT + ih} className="ck-projCut" /> : null}

          {labels.map((lab, i) => (
            <text key={lab + i} x={xFor(i)} y={h - 18} textAnchor="middle" className="ck-areaX">
              {lab}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* =========================
   Processos helpers (Dashboard)
========================= */
function buildProcessTypeCounts(kappiObj) {
  const analyses = getKappiAnalyses(kappiObj);
  const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
  const cases = Array.isArray(legal?.case_lists_by_document) ? legal.case_lists_by_document : [];

  const map = {};
  for (const c of cases) {
    const t = (c?.type || "SEM TIPO").toString().trim().toUpperCase();
    map[t] = (map[t] || 0) + 1;
  }

  const items = Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return { total: cases.length, items, cases, legal };
}

function sumAlertsFromLegal(legal, cases) {
  const apd = legal?.alerts_per_documento;
  if (apd && typeof apd === "object") {
    let sum = 0;
    for (const v of Object.values(apd)) {
      const n = Number(v);
      if (isFinite(n)) sum += n;
    }
    if (sum > 0) return sum;
  }

  let count = 0;
  for (const c of cases || []) {
    const a = c?.alert;
    if (a === true) count += 1;
    else if (typeof a === "string" && a.trim() && a.trim().toLowerCase() !== "false" && a.trim() !== "0") count += 1;
    else if (typeof a === "number" && a > 0) count += 1;
  }
  return count;
}

function buildClassAmounts(cases) {
  const map = new Map();

  for (const c of cases || []) {
    const klass = (c?.process_class || "SEM CLASSE").toString().trim() || "SEM CLASSE";
    const t = (c?.type || "").toString().trim().toUpperCase();
    const claim = parseMoneyToNumber(c?.claim_value);

    if (!map.has(klass)) map.set(klass, { label: klass, passive: 0, active: 0 });

    const row = map.get(klass);
    if (t === "PASSIVE" || t === "PASSIVO") row.passive += claim;
    else if (t === "ACTIVE" || t === "ATIVO") row.active += claim;
  }

  const items = Array.from(map.values()).filter((x) => (x.passive || 0) > 0 || (x.active || 0) > 0);
  items.sort((a, b) => b.passive + b.active - (a.passive + a.active));
  return items.slice(0, 12);
}

function extractYearFromMovements(caseMovements) {
  let first = null;

  if (Array.isArray(caseMovements) && caseMovements.length > 0) first = caseMovements[0];
  else if (typeof caseMovements === "string") first = caseMovements;
  else return null;

  const s = typeof first === "string" ? first : JSON.stringify(first);
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : null;
}

function buildCasesByYear(cases) {
  const map = new Map();

  for (const c of cases || []) {
    const y = extractYearFromMovements(c?.case_movements);
    if (!y) continue;
    map.set(y, (map.get(y) || 0) + 1);
  }

  const items = Array.from(map.entries())
    .map(([year, count]) => ({ label: year, value: count }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  return items;
}

/* =========================
   “IA” Resumo (placeholder)
========================= */
function sumClaimsByType(cases) {
  let passive = 0;
  let active = 0;

  for (const c of cases || []) {
    const t = (c?.type || "").toString().trim().toUpperCase();
    const claim = parseMoneyToNumber(c?.claim_value);
    if (t === "PASSIVE" || t === "PASSIVO") passive += claim;
    else if (t === "ACTIVE" || t === "ATIVO") active += claim;
  }
  return { passive, active };
}

function computeMaxLoan({ patrimonioHoje, alertCount, totalCases, passiveClaims, activeClaims }) {
  const base = Math.max(0, (Number(patrimonioHoje) || 0) * 0.12);

  const penaltyAlerts = Math.min(0.55, (alertCount || 0) * 0.01);
  const penaltyCases = Math.min(0.25, (totalCases || 0) * 0.0025);

  const netClaims = Math.max(0, (activeClaims || 0) - (passiveClaims || 0));
  const boostNet = Math.min(0.18, netClaims / 5_000_000);

  const factor = Math.max(0.15, 1 - penaltyAlerts - penaltyCases + boostNet);
  const out = base * factor;

  return Math.round(out / 10_000) * 10_000;
}

function buildAiSummaryText({ nome, totalCases, alertCount, passiveClaims, activeClaims, maxLoan }) {
  const parts = [];
  parts.push(`Resumo (IA — fictício):`);
  if (nome) parts.push(`- Perfil analisado: ${nome}.`);

  parts.push(`- Processos identificados: ${totalCases}.`);
  parts.push(`- Alertas relevantes: ${alertCount}.`);

  if (passiveClaims > 0) parts.push(`- Passivo estimado em processos: ${formatBRL(passiveClaims)}.`);
  if (activeClaims > 0) parts.push(`- Ativo estimado (a receber): ${formatBRL(activeClaims)}.`);

  parts.push(`- Recomendação: limite máximo sugerido de empréstimo = ${formatBRL(maxLoan)} (estimativa automática).`);
  parts.push(`Observações: placeholder para trocar depois por um modelo real.`);
  return parts.join("\n");
}

/* =========================
   Dashboard (com botões fake)
========================= */
function downloadFakeFile({ filename, contentType, contentText }) {
  try {
    const blob = new Blob([contentText || "Arquivo placeholder (fake)."], { type: contentType || "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "arquivo_fake.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  } catch (e) {
    // silencioso
  }
}

export default function TabDashboard({ kappiObj }) {
  const [societarias] = useState(() => [
    { id: "soc-1", nome: "Empresa A", marketValue: 120_000_000, participationPct: 12 },
    { id: "soc-2", nome: "Empresa B", marketValue: 35_000_000, participationPct: 28 },
    { id: "soc-3", nome: "Empresa C", marketValue: 8_000_000, participationPct: 40 },
    { id: "soc-4", nome: "Empresa D", marketValue: 250_000_000, participationPct: 3 },
    { id: "soc-5", nome: "Empresa E", marketValue: 60_000_000, participationPct: 15 },
  ]);

  const societariasCalc = useMemo(() => {
    return societarias.map((e) => ({
      ...e,
      proportionalValue: e.marketValue * (e.participationPct / 100),
    }));
  }, [societarias]);

  const [vehicleName, setVehicleName] = useState("");
  const [veiculos, setVeiculos] = useState(() => [
    { id: "vei-1", name: "Toyota Corolla 2020", fipeValue: fakeFipeValue("Toyota Corolla 2020") },
  ]);

  function addVehicle() {
    const name = (vehicleName || "").trim();
    if (!name) return;

    const v = { id: `vei-${Date.now()}`, name, fipeValue: fakeFipeValue(name) };
    setVeiculos((prev) => [v, ...prev]);
    setVehicleName("");
  }

  function removeVehicle(id) {
    setVeiculos((prev) => prev.filter((x) => x.id !== id));
  }

  const [imovelTipo, setImovelTipo] = useState("");
  const [imovelLocal, setImovelLocal] = useState("");

  const [imoveis, setImoveis] = useState(() => [
    { id: "imo-1", tipo: "Apartamento", endereco: "Rua Oscar Freire, São Paulo - SP", estimatedValue: 1_800_000 },
    { id: "imo-2", tipo: "Casa", endereco: "Lago Sul, Brasília - DF", estimatedValue: 3_250_000 },
    { id: "imo-3", tipo: "Terreno", endereco: "Barra da Tijuca, Rio de Janeiro - RJ", estimatedValue: 2_100_000 },
  ]);

  const [selectedImovelId, setSelectedImovelId] = useState(imoveis[0]?.id || "");
  const selectedImovel = useMemo(
    () => imoveis.find((x) => x.id === selectedImovelId) || imoveis[0],
    [imoveis, selectedImovelId]
  );

  function addImovel() {
    const tipo = (imovelTipo || "").trim();
    const local = (imovelLocal || "").trim();
    if (!tipo || !local) return;

    const novo = { id: `imo-${Date.now()}`, tipo, endereco: local, estimatedValue: fakeImovelValue(tipo, local) };
    setImoveis((prev) => [novo, ...prev]);
    setSelectedImovelId(novo.id);
    setImovelTipo("");
    setImovelLocal("");
  }

  const mapsUrl = useMemo(() => {
    const addr = selectedImovel?.endereco || "Av. Paulista, São Paulo - SP";
    return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
  }, [selectedImovel]);

  const iaRegionText = useMemo(() => {
    const addr = selectedImovel?.endereco || "";
    const base =
      "Análise (fictícia):\n" +
      "- Região com boa liquidez e infraestrutura.\n" +
      "- Serviços e acessos favorecem valorização.\n" +
      "- Potencial de demanda consistente para venda/locação.\n";

    if (/são paulo|paulista|oscar freire/i.test(addr)) return base + "- Observação: alta densidade comercial e preço de m² elevado.";
    if (/brasília|lago sul/i.test(addr)) return base + "- Observação: área nobre e limitada, tende a sustentar preços.";
    if (/barra da tijuca|rio de janeiro/i.test(addr)) return base + "- Observação: valorização ligada a ciclos de mercado e infraestrutura local.";
    return base + "- Observação: valorização moderada (estimativa).";
  }, [selectedImovel]);

  const proc = useMemo(() => buildProcessTypeCounts(kappiObj), [kappiObj]);
  const alertCount = useMemo(() => sumAlertsFromLegal(proc.legal, proc.cases), [proc]);
  const byYear = useMemo(() => buildCasesByYear(proc.cases), [proc]);
  const classAmounts = useMemo(() => buildClassAmounts(proc.cases), [proc]);

  const { passive: passiveClaims, active: activeClaims } = useMemo(() => sumClaimsByType(proc.cases), [proc]);

  const PROJ = 4;
  const [rangeYears, setRangeYears] = useState(() => {
    const now = new Date().getFullYear();
    return { start: now - 4, end: now };
  });

  const patrimonio = useMemo(() => {
    return computePatrimonioSeries({
      startYear: rangeYears.start,
      endYear: rangeYears.end,
      projectionYears: PROJ,
      societarias: societariasCalc,
      imoveis,
      veiculos,
    });
  }, [rangeYears, societariasCalc, imoveis, veiculos]);

  const totalSoc = societariasCalc.reduce((acc, x) => acc + (Number(x.proportionalValue) || 0), 0);
  const totalImo = imoveis.reduce((acc, x) => acc + (Number(x.estimatedValue) || 0), 0);
  const totalVei = veiculos.reduce((acc, x) => acc + (Number(x.fipeValue) || 0), 0);

  const patrimonioHoje = patrimonio.series.find((x) => x.label === String(rangeYears.end))?.value || 0;
  const patrimonioProjetado = patrimonio.series[patrimonio.series.length - 1]?.value || 0;

  const maxLoan = useMemo(() => {
    return computeMaxLoan({
      patrimonioHoje,
      alertCount,
      totalCases: proc.total,
      passiveClaims,
      activeClaims,
    });
  }, [patrimonioHoje, alertCount, proc.total, passiveClaims, activeClaims]);

  const nomePessoa = useMemo(() => {
    const raw = getKappiRaw(kappiObj);
    const ents = Array.isArray(raw?.entities) ? raw.entities : [];
    const first = ents[0];
    return first?.name || first?.razao_social || first?.nome_fantasia || "";
  }, [kappiObj]);

  const aiSummary = useMemo(() => {
    return buildAiSummaryText({
      nome: nomePessoa,
      totalCases: proc.total,
      alertCount,
      passiveClaims,
      activeClaims,
      maxLoan,
    });
  }, [nomePessoa, proc.total, alertCount, passiveClaims, activeClaims, maxLoan]);

  const veiculosSorted = useMemo(
    () => [...veiculos].sort((a, b) => (b.fipeValue || 0) - (a.fipeValue || 0)),
    [veiculos]
  );

  function downloadExcelFake() {
    downloadFakeFile({
      filename: "relatorio_kappi_fake.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentText: "Excel fake (placeholder). Depois você liga no backend real.",
    });
  }

  function downloadPdfFake() {
    downloadFakeFile({
      filename: "relatorio_kappi_fake.pdf",
      contentType: "application/pdf",
      contentText: "PDF fake (placeholder). Depois você liga no backend real.",
    });
  }

  return (
    <div className="ck-dashboard">
      <div className="ck-section">
        <div className="ck-rowHead">
          <div>
            <div className="ck-section__title" style={{ marginBottom: 0 }}>
              KPIs de patrimônio (fake) + alertas (real)
            </div>
            <div className="ck-sub" style={{ marginTop: 6 }}>
              Botões abaixo são placeholders de exportação.
            </div>
          </div>

          <div className="ck-exportBtns">
            <button className="ck-btn ck-btn--ghost" type="button" onClick={downloadExcelFake}>
              Baixar Excel (fake)
            </button>
            <button className="ck-btn ck-btn--ghost" type="button" onClick={downloadPdfFake}>
              Baixar PDF (fake)
            </button>
          </div>
        </div>

        <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
          <div className="ck-metric">
            <div className="ck-metric__k">Empresas</div>
            <div className="ck-metric__v">{societariasCalc.length}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Imóveis</div>
            <div className="ck-metric__v">{imoveis.length}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Veículos</div>
            <div className="ck-metric__v">{veiculos.length}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Alertas (real)</div>
            <div className="ck-metric__v">{alertCount}</div>
          </div>
        </div>

        <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
          <div className="ck-metric">
            <div className="ck-metric__k">Societário (proporcional)</div>
            <div className="ck-metric__v">{formatBRL(totalSoc)}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Imóveis (estimado)</div>
            <div className="ck-metric__v">{formatBRL(totalImo)}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Veículos (FIPE fake)</div>
            <div className="ck-metric__v">{formatBRL(totalVei)}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Patrimônio ({rangeYears.end})</div>
            <div className="ck-metric__v">{formatBRL(patrimonioHoje)}</div>
          </div>
        </div>

        <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
          <div className="ck-metric">
            <div className="ck-metric__k">Projeção (+{PROJ} anos)</div>
            <div className="ck-metric__v">{formatBRL(patrimonioProjetado)}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Ano projetado</div>
            <div className="ck-metric__v">{rangeYears.end + PROJ}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Passivo processos</div>
            <div className="ck-metric__v">{formatBRL(passiveClaims)}</div>
          </div>
          <div className="ck-metric">
            <div className="ck-metric__k">Ativo (a receber)</div>
            <div className="ck-metric__v">{formatBRL(activeClaims)}</div>
          </div>
        </div>
      </div>

      <div className="ck-span2">
        <div className="ck-section">
          <div className="ck-rowHead">
            <div>
              <div className="ck-section__title" style={{ marginBottom: 0 }}>
                Patrimônio total (R$) com projeção
              </div>
              <div className="ck-sub" style={{ marginTop: 6 }}>
                Série vai de {rangeYears.start} até {rangeYears.end + PROJ} (projeção fixa de +{PROJ} anos)
              </div>
            </div>

            <div className="ck-yearRange">
              <label>Início</label>
              <input
                type="number"
                value={rangeYears.start}
                onChange={(e) =>
                  setRangeYears((p) => {
                    const v = Number(e.target.value);
                    const start = Math.min(v, rangeYears.end);
                    return { ...p, start };
                  })
                }
              />
              <label>Ano base</label>
              <input
                type="number"
                value={rangeYears.end}
                onChange={(e) =>
                  setRangeYears((p) => {
                    const v = Number(e.target.value);
                    const end = Math.max(v, rangeYears.start);
                    return { ...p, end };
                  })
                }
              />
            </div>
          </div>

          <PatrimonioChart title="Patrimônio total (R$)" items={patrimonio.series} cutYear={rangeYears.end} />
        </div>
      </div>

      <div className="ck-grid2">
        <div className="ck-section">
          <div className="ck-section__title">Processos por ano (real)</div>
          <AreaLineChart title="Processos por ano" items={byYear.length ? byYear : []} />
        </div>

        <div className="ck-section">
          <div className="ck-section__title">Resumo (IA)</div>

          <div className="ck-aiSummary">
            <div className="ck-aiSummaryTop">
              <div className="ck-aiBadge">IA • Resumo automático</div>
              <div className="ck-aiLoan">
                <div className="ck-aiLoan__k">Empréstimo máximo recomendado</div>
                <div className="ck-aiLoan__v">{formatBRL(maxLoan)}</div>
              </div>
            </div>

            <pre className="ck-aiSummaryText">{aiSummary}</pre>

            <div className="ck-mini" style={{ marginTop: 10 }}>
              <span className="ck-pill">
                <b>Total processos:</b> {proc.total}
              </span>
              <span className="ck-pill">
                <b>Alertas:</b> {alertCount}
              </span>
              <span className="ck-pill">
                <b>Passivo:</b> {formatBRL(passiveClaims)}
              </span>
              <span className="ck-pill">
                <b>Ativo:</b> {formatBRL(activeClaims)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ck-span2">
        <VerticalGroupedBars
          title="Classe processual (passivo x ativo)"
          subtitle="Somatório de claim_value por classe (até 12 classes com maior volume)"
          items={classAmounts}
        />
      </div>

      <div className="ck-grid2">
        <div className="ck-section">
          <div className="ck-section__title">Veículos (FIPE fake)</div>

          <div className="ck-addRow">
            <input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="Ex: Honda Civic 2019" />
            <button className="ck-btn ck-btn--ghost" type="button" onClick={addVehicle}>
              Adicionar veículo
            </button>
          </div>

          <div className="ck-smallNote">
            * Por enquanto é fake (valores gerados automaticamente). Depois você troca por consulta real na tabela FIPE.
          </div>

          <div className="ck-miniTable">
            <div className="ck-miniTable__head">
              <div>Veículo</div>
              <div style={{ textAlign: "right" }}>Valor (FIPE)</div>
              <div style={{ width: 80, textAlign: "right" }}>Ações</div>
            </div>

            {veiculosSorted.map((v) => (
              <div className="ck-miniTable__row" key={v.id}>
                <div className="ck-ellipsis" title={v.name}>
                  {v.name}
                </div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{formatBRL(v.fipeValue)}</div>
                <div style={{ textAlign: "right" }}>
                  <button className="ck-linkBtn" onClick={() => removeVehicle(v.id)} type="button">
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ck-section">
          <div className="ck-section__title">Imóveis (fake)</div>

          <div className="ck-addImovel">
            <input value={imovelTipo} onChange={(e) => setImovelTipo(e.target.value)} placeholder="Tipo (ex: Casa, Apto, Terreno)" />
            <input value={imovelLocal} onChange={(e) => setImovelLocal(e.target.value)} placeholder="Local (ex: Moema, SP / Lago Sul, DF)" />
            <button className="ck-btn ck-btn--ghost" type="button" onClick={addImovel}>
              Adicionar imóvel
            </button>
          </div>

          <div className="ck-smallNote">* Valor estimado é fake (gerado). Depois você liga isso em uma fonte real.</div>

          <div className="ck-miniTable">
            <div className="ck-miniTable__head ck-miniTable__head--imovel">
              <div>Tipo</div>
              <div>Localização</div>
              <div style={{ textAlign: "right" }}>Valor estimado</div>
            </div>

            {imoveis.map((i) => (
              <button
                key={i.id}
                className={`ck-miniTable__row ck-miniRowBtn ck-miniRowBtn--imovel ${selectedImovelId === i.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setSelectedImovelId(i.id)}
                title="Clique para ver no mapa"
              >
                <div style={{ fontWeight: 900 }}>{i.tipo}</div>
                <div className="ck-ellipsis">{i.endereco}</div>
                <div style={{ textAlign: "right", fontWeight: 900 }}>{formatBRL(i.estimatedValue)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ck-section">
        <div className="ck-section__title">Mapa (Google) + “IA” da região (fake)</div>

        <div className="ck-mapRow">
          <div className="ck-map">
            <iframe title="Mapa" src={mapsUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>

          <div className="ck-aiBox">
            <div className="ck-aiTitle">Resumo de valorização (fictício)</div>
            <div className="ck-aiSub">
              Imóvel selecionado: <b>{selectedImovel?.tipo}</b>
              <br />
              Local: {selectedImovel?.endereco}
              <br />
              Valor estimado: {formatBRL(selectedImovel?.estimatedValue)}
            </div>
            <pre className="ck-aiText">{iaRegionText}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
