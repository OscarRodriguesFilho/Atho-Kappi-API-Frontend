// src/components/consulta_individual/SheetDashboard.jsx
import React, { useMemo, useState, useEffect } from "react";

/* =========================
   Utils
========================= */
function formatBRL(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatBRLShort(n) {
  const v = Number(n);
  if (!isFinite(v)) return "—";
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) return `R$ ${(v / 1_000_000_000).toFixed(1).replace(".", ",")} bi`;
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatBRL(v);
}

/**
 * Parser de dinheiro robusto:
 * - aceita: "R$ 1.234,56", "1.234,56", "1234,56", "1,234.56"
 * - decide separador decimal pelo ÚLTIMO ("," ou ".")
 */
function parseMoneyToNumber(v) {
  if (v == null) return 0;

  if (typeof v === "number") {
    return isFinite(v) ? v : 0;
  }

  const s0 = String(v).trim();
  if (!s0) return 0;

  const onlySymbols = s0.replace(/[0-9]/g, "").trim();
  if (onlySymbols === "R$" || onlySymbols === "R$-" || onlySymbols === "-" || onlySymbols === "—") return 0;

  let s = s0.replace(/\s/g, "").replace(/R\$/gi, "").replace(/[^\d.,-]/g, "");

  if (!s.includes(",") && !s.includes(".")) {
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const decSep = lastComma > lastDot ? "," : ".";

  if (decSep === ",") {
    s = s.replace(/\./g, "").replace(/,/g, ".");
  } else {
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  return isFinite(n) ? n : 0;
}

function normalizeTitle(t) {
  return (t || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
}

function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

function safeStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

function firstObj(arr) {
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}


/* =========================
   ✅ Movimentações (case_movements -> últimos 6/12/18 meses)
   REGRA:
   - Para STRING: a primeira data é sempre a última movimentação (mais recente).
   - Para ARRAY/OBJ: pega a MAIOR data encontrada (mais recente), pois a ordem pode variar.
   - SEM filtros de tramitação/status/etc.
   - Dedup por process_number (ou fallback) para não contar processo duplicado.
========================= */

function parseDateLooseAny(v) {
  if (v == null) return null;

  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === "number" && isFinite(v)) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  const isoTry = new Date(s);
  if (!isNaN(isoTry.getTime())) return isoTry;

  let m = s.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/\b(\d{2})-(\d{2})-(\d{4})\b/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function addMonths(date, months) {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function getProcId(c, idx) {
  return (
    String(c?.process_number || "").trim() ||
    String(c?.process_url || "").trim() ||
    String(c?.id || "").trim() ||
    String(c?.case_id || "").trim() ||
    `__idx__${idx}`
  );
}

/**
 * ✅ Retorna a data da última movimentação (mais recente)
 * - string: primeira data do texto
 * - array/obj: maior data encontrada
 */
function getLastMovementDateFromCaseMovements(caseMovements) {
  if (!caseMovements) return null;

  // ARRAY: pega a MAIOR data encontrada (mais recente)
  if (Array.isArray(caseMovements)) {
    let best = null;

    for (const x of caseMovements) {
      if (!x) continue;

      const ds =
        x.date ??
        x.data ??
        x.dt ??
        x.movement_date ??
        x.movementDate ??
        x.created_at ??
        x.createdAt ??
        x.updated_at ??
        x.updatedAt ??
        x.timestamp ??
        null;

      const tx =
        x.text ??
        x.descricao ??
        x.description ??
        x.movement ??
        x.movimento ??
        x.nome ??
        x.title ??
        x.event ??
        "";

      const d = parseDateLooseAny(ds) || parseDateLooseAny(tx);
      if (d && (!best || d > best)) best = d;
    }

    return best;
  }

  // OBJ: tenta achar arrays dentro; senão serializa
  if (typeof caseMovements === "object") {
    const candidates =
      caseMovements.movements ||
      caseMovements.movement ||
      caseMovements.items ||
      caseMovements.results ||
      caseMovements.data ||
      null;

    if (Array.isArray(candidates)) return getLastMovementDateFromCaseMovements(candidates);

    try {
      return getLastMovementDateFromCaseMovements(JSON.stringify(caseMovements));
    } catch {
      return null;
    }
  }

  // STRING: pega a PRIMEIRA data do texto (sua regra do print)
  const s = String(caseMovements).trim();
  if (!s) return null;

  const m = s.match(/\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\b/);
  if (!m) return null;

  return parseDateLooseAny(m[1]);
}

/**
 * ✅ Conta processos por faixa (6/12/18 meses)
 * - SEM filtros
 * - COM dedup por procId
 */
function buildInTramitacaoCounts(cases) {
  const now = new Date();
  const cut6 = addMonths(now, -6);
  const cut12 = addMonths(now, -12);
  const cut18 = addMonths(now, -18);

  const seen6 = new Set();
  const seen12 = new Set();
  const seen18 = new Set();

  for (let idx = 0; idx < (cases || []).length; idx++) {
    const c = cases[idx];
    const procId = getProcId(c, idx);

    const d = getLastMovementDateFromCaseMovements(c?.case_movements);
    if (!d) continue;

    if (d >= cut18) seen18.add(procId);
    if (d >= cut12) seen12.add(procId);
    if (d >= cut6) seen6.add(procId);
  }

  return { last6: seen6.size, last12: seen12.size, last18: seen18.size };
}

/**
 * 🔎 (Opcional) Debug rápido:
 * Rode isso no lugar que você tem acesso a "cases" pra entender o 12.
 * Exemplo: console.table(debugLastMovements(cases).filter(x => x.in6));
 */
function debugLastMovements(cases) {
  const now = new Date();
  const cut6 = addMonths(now, -6);
  const cut12 = addMonths(now, -12);
  const cut18 = addMonths(now, -18);

  const out = [];
  const seen = new Set();

  for (let idx = 0; idx < (cases || []).length; idx++) {
    const c = cases[idx];
    const procId = getProcId(c, idx);
    if (seen.has(procId)) continue; // dedup no debug também
    seen.add(procId);

    const d = getLastMovementDateFromCaseMovements(c?.case_movements);

    out.push({
      procId,
      process_number: String(c?.process_number || ""),
      lastMovement: d ? d.toISOString().slice(0, 10) : null,
      in6: !!(d && d >= cut6),
      in12: !!(d && d >= cut12),
      in18: !!(d && d >= cut18),
    });
  }

  return out;
}

/* =========================
   KAPPI helpers
========================= */
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
   Gráfico: área/linha (counts)
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

/* =========================
   Gráfico: área/linha (dinheiro)
========================= */
function MoneyAreaLineChart({ title, items }) {
  const w = 700;
  const h = 300;
  const padL = 118;
  const padR = 22;
  const padT = 34;
  const padB = 50;

  const values = items.map((x) => Number(x.value || 0));
  const labels = items.map((x) => String(x.label));

  const maxRaw = Math.max(1, ...values);

  const step = (() => {
    if (maxRaw <= 10_000) return 1_000;
    if (maxRaw <= 100_000) return 10_000;
    if (maxRaw <= 1_000_000) return 100_000;
    if (maxRaw <= 10_000_000) return 1_000_000;
    return 5_000_000;
  })();

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
    const s = Math.max(step, Math.ceil(max / (n - 1) / step) * step);
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
                  {formatBRLShort(t)}
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

/* =========================
   ✅ BARRAS ÚNICAS (ATIVO x PASSIVO) COM SIGLAS NO EIXO X
========================= */
function stripAccents(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildClassAbbreviation(fullLabel) {
  const raw = stripAccents(fullLabel).toUpperCase().replace(/[^A-Z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!raw) return "CLS";

  const words = raw.split(" ").filter(Boolean);

  const stop = new Set(["DE", "DO", "DA", "DOS", "DAS", "E", "EM", "NA", "NO", "NAS", "NOS", "A", "O", "AS", "OS", "POR"]);
  const filtered = words.filter((w) => !stop.has(w));

  for (const w of filtered) {
    if (w.length >= 2 && w.length <= 5 && /^[A-Z0-9]+$/.test(w)) {
      if (w.length <= 4) return w;
    }
  }

  const initials = (filtered.length ? filtered : words).map((w) => w[0]).join("");
  if (initials.length >= 2) return initials.slice(0, 4);

  return (filtered[0] || words[0] || "CLS").slice(0, 4);
}

function buildUniqueAbbrevMap(items) {
  const used = new Map();
  const rows = [];

  for (const it of items || []) {
    const full = String(it.label || "").trim() || "SEM CLASSE";
    let abbr = buildClassAbbreviation(full);

    const key = abbr;
    const n = used.get(key) || 0;
    used.set(key, n + 1);

    if (n > 0) {
      const suffix = String(n + 1);
      abbr = (abbr.slice(0, Math.max(1, 4 - suffix.length)) + suffix).slice(0, 4);
    }

    rows.push({
      ...it,
      _fullLabel: full,
      _abbr: abbr,
    });
  }

  return rows;
}

function AbbrevGroupedBars({ title, subtitle, items }) {
  const rows = useMemo(() => buildUniqueAbbrevMap(items || []), [items]);

  const w = 760;
  const h = 300;
  const padL = 70;
  const padR = 18;
  const padT = 18;
  const padB = 64;

  const vals = rows.flatMap((r) => [Number(r.passive || 0), Number(r.active || 0)]);
  const maxRaw = Math.max(1, ...vals.filter((v) => isFinite(v)));
  const max = maxRaw;

  const iw = w - padL - padR;
  const ih = h - padT - padB;

  const n = rows.length || 1;
  const groupW = iw / n;

  const barGap = Math.max(2, Math.min(10, groupW * 0.12));
  const barW = Math.max(6, Math.min(18, (groupW - barGap) / 2));

  const xForGroup = (i) => padL + groupW * i + groupW / 2;
  const yFor = (v) => padT + ih - (ih * Math.max(0, v)) / max;

  const ticks = (() => {
    const tN = 5;
    const step = max / tN;
    const out = [];
    for (let i = 0; i <= tN; i++) out.push(i * step);
    return out;
  })();

  // ✅ Altura-alvo do “bloco gráfico + coluna da legenda”
  // (gráfico SVG + legenda "Passivo/Ativo" + padding)
  const panelH = h + 14 /* respiro */ + 44 /* legenda Passivo/Ativo */ + 20 /* padding/margens */;

  return (
    <div className="ck-chart ck-chart--vbars">
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
        {subtitle ? <div className="ck-chart__sub">{subtitle}</div> : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          gap: 16,
          marginTop: 10,
          alignItems: "stretch",
        }}
      >
        {/* =========================
            COLUNA ESQUERDA: GRÁFICO
        ========================= */}
        <div
          className="ck-areaWrap"
          style={{
            height: panelH,
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {/* ✅ SVG ocupa “tudo que sobrar” */}
          <div style={{ flex: "1 1 auto", minHeight: 0 }}>
            <svg
              viewBox={`0 0 ${w} ${h}`}
              className="ck-areaSvg"
              role="img"
              aria-label={title}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              {ticks.map((t, idx) => {
                const y = yFor(t);
                return (
                  <g key={idx}>
                    <line x1={padL} y1={y} x2={w - padR} y2={y} className="ck-areaGrid" />
                    <text x={padL - 12} y={y + 4} textAnchor="end" className="ck-areaTick">
                      {formatBRLShort(t)}
                    </text>
                  </g>
                );
              })}

              {rows.map((r, i) => {
                const p = Number(r.passive || 0);
                const a = Number(r.active || 0);

                const gx = xForGroup(i);

                const pX = gx - barW - barGap / 2;
                const aX = gx + barGap / 2;

                const pY = yFor(p);
                const aY = yFor(a);

                const baseY = padT + ih;

                const pH = Math.max(0, baseY - pY);
                const aH = Math.max(0, baseY - aY);

                return (
                  <g key={r._abbr + i}>
                    <rect x={pX} y={pY} width={barW} height={pH} rx="5" ry="5" fill="#d11a2a" opacity="0.92">
                      <title>{`${r._fullLabel}\nPassivo: ${formatBRL(p)}\nAtivo: ${formatBRL(a)}`}</title>
                    </rect>

                    <rect x={aX} y={aY} width={barW} height={aH} rx="5" ry="5" fill="#1bbf6b" opacity="0.92">
                      <title>{`${r._fullLabel}\nPassivo: ${formatBRL(p)}\nAtivo: ${formatBRL(a)}`}</title>
                    </rect>

                    <text x={gx} y={h - 22} textAnchor="middle" className="ck-areaX" style={{ fontWeight: 900 }}>
                      {r._abbr}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* legenda passivo/ativo fixa embaixo */}
          <div className="ck-legend" style={{ marginTop: 10, flex: "0 0 auto" }}>
            <span className="ck-legendItem">
              <span className="ck-dot is-red" /> Passivo (deve)
            </span>
            <span className="ck-legendItem">
              <span className="ck-dot is-green" /> Ativo (a receber)
            </span>
          </div>
        </div>

        {/* =========================
            COLUNA DIREITA: LEGENDA (COM SCROLL)
        ========================= */}
        <div
          style={{
            height: panelH,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* ✅ Cabeçalho fixo */}
          <div style={{ fontWeight: 900, fontSize: 12, opacity: 0.8, paddingLeft: 2, flex: "0 0 auto" }}>
            Legenda de siglas
          </div>

          {/* ✅ Lista com rolagem */}
          <div
            style={{
              flex: "1 1 auto",
              minHeight: 0,
              overflowY: "auto",
              paddingRight: 6, // espaço p/ scrollbar não colar
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {rows.map((r) => (
              <div
                key={r._abbr + r._fullLabel}
                style={{
                  display: "grid",
                  gridTemplateColumns: "96px 1fr",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#fff",
                }}
                title={r._fullLabel}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontWeight: 1000,
                    letterSpacing: 0.5,
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(60,120,216,0.95)",
                      flex: "0 0 auto",
                    }}
                  />
                  <span>{r._abbr}</span>
                </div>

                <div
                  style={{
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {r._fullLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* =========================
   ✅ Pizza por RAMO/JURISDIÇÃO (somente PASSIVO)
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

function colorForLabel(label) {
  const h = stableHashNumber(label) % 360;
  return `hsl(${h} 72% 48%)`;
}

function PiePassiveJurisdictions({ title, items }) {
  const total = items && items.length ? items.reduce((s, x) => s + Number(x.value || 0), 0) : 0;

  const w = 240;
  const h = 240;
  const cx = 120;
  const cy = 120;
  const r = 92;

  function arcPath(startAngle, endAngle) {
    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  }

  let angle = -90;

  return (
    <div className="ck-chart" style={{ padding: 14 }}>
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
        <div className="ck-chart__sub">Distribuição de processos passivos por Ramo / Jurisdição (quantidade)</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 14, alignItems: "center" }}>
        <div style={{ width: 260, height: 260, display: "grid", placeItems: "center" }}>
          <svg viewBox={`0 0 ${w} ${h}`} width="260" height="260" aria-label={title} role="img">
            {total ? (
              items.map((it) => {
                const start = angle;
                const sweep = (Number(it.value || 0) / total) * 360;
                const end = angle + sweep;
                angle = end;
                if ((it.value || 0) <= 0) return null;
                return <path key={it.label} d={arcPath(start, end)} fill={colorForLabel(it.label)} />;
              })
            ) : (
              <circle cx={cx} cy={cy} r={r} fill="rgba(0,0,0,0.06)" />
            )}

            <circle cx={cx} cy={cy} r={54} fill="#fff" />
            <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 14, fontWeight: 900, fill: "#111" }}>
              Total
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: "#111" }}>
              {total || 0}
            </text>
          </svg>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((row) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "#fff",
              }}
              title={row.label}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: colorForLabel(row.label),
                  flex: "0 0 auto",
                }}
              />
              <div style={{ flex: 1, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.label}
              </div>
              <div style={{ fontWeight: 900 }}>{row.value || 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   ✅ Barra Final Score (0..1000)
========================= */
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

function scoreColorAt01(t) {
  const tt = clamp01(t);

  const r1 = { r: 0xd1, g: 0x1a, b: 0x2a };
  const r2 = { r: 0xf0, g: 0xb4, b: 0x29 };
  const r3 = { r: 0x1b, g: 0xbf, b: 0x6b };

  if (tt <= 0.5) {
    const k = tt / 0.5;
    const r = Math.round(lerp(r1.r, r2.r, k));
    const g = Math.round(lerp(r1.g, r2.g, k));
    const b = Math.round(lerp(r1.b, r2.b, k));
    return `rgb(${r},${g},${b})`;
  } else {
    const k = (tt - 0.5) / 0.5;
    const r = Math.round(lerp(r2.r, r3.r, k));
    const g = Math.round(lerp(r2.g, r3.g, k));
    const b = Math.round(lerp(r2.b, r3.b, k));
    return `rgb(${r},${g},${b})`;
  }
}

function ScoreGradientBar({ title, value = 0, min = 0, max = 1000, subtitle = "", rightLabel = "" }) {
  const v = Number(value || 0);
  const clamped = Math.max(min, Math.min(max, isFinite(v) ? v : 0));
  const t01 = max > min ? (clamped - min) / (max - min) : 0;
  const pct = clamp01(t01) * 100;
  const fillColor = scoreColorAt01(t01);

  return (
    <div
      className="ck-chart"
      style={{
        padding: 14,
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 14,
        background: "#fff",
      }}
    >
      <div className="ck-chart__head">
        <div className="ck-chart__title">{title}</div>
        {subtitle ? <div className="ck-chart__sub">{subtitle}</div> : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            height: 14,
            borderRadius: 999,
            background: "rgba(0,0,0,0.08)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: fillColor,
              borderRadius: 999,
              transition: "width 120ms linear",
            }}
            title={`${clamped}`}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {min} → {max}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{clamped}</div>
            {rightLabel ? <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75 }}>{rightLabel}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Processos (REAL)
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

function getLegalTotalsIfPresent(legal) {
  if (!legal || typeof legal !== "object") return null;

  const t = legal.total;
  if (t && typeof t === "object") {
    const assets = parseMoneyToNumber(t.assets ?? t.active ?? t.ativo);
    const liabilities = parseMoneyToNumber(t.liabilities ?? t.passive ?? t.passivo);
    if (assets > 0 || liabilities > 0) return { active: assets, passive: liabilities, source: "legal.total" };
  }

  const perDoc = legal.totalizers_per_document;
  if (perDoc && typeof perDoc === "object") {
    let assetsSum = 0;
    let liabilitiesSum = 0;

    for (const v of Object.values(perDoc)) {
      if (!v || typeof v !== "object") continue;
      assetsSum += parseMoneyToNumber(v.assets ?? v.active ?? v.ativo);
      liabilitiesSum += parseMoneyToNumber(v.liabilities ?? v.passive ?? v.passivo);
    }

    if (assetsSum > 0 || liabilitiesSum > 0) {
      return { active: assetsSum, passive: liabilitiesSum, source: "legal.totalizers_per_document" };
    }
  }

  return null;
}

function sumClaimsFallbackFromCases(cases) {
  let passive = 0;
  let active = 0;

  for (const c of cases || []) {
    const t = (c?.type || "").toString().trim().toUpperCase();
    const claim = parseMoneyToNumber(c?.claim_value);

    if (t === "PASSIVE" || t === "PASSIVO") passive += claim;
    else if (t === "ACTIVE" || t === "ATIVO") active += claim;
  }

  return { passive, active, source: "sum(cases.claim_value by type)" };
}

/* =========================
   FILTRO DE CLASSES QUE NÃO INTERESSAM
   (usando seu regex)
========================= */

function stripAccentsLoose(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/*
   COLE SEU REGEX COMPLETO AQUI
   Pode colocar exatamente o que você montou.
*/
const CLASSE_EXCLUDE_REGEX = new RegExp(
  String.raw`(?<!\w)(AP\s)(?!\w)|\b(agravo|apelação|carta de ordem|carta precatória|embargos|cautelares|alvará|rescisória|recurso|homologação|testamento|penal|criminal|infância\s+(busca|guarda)|juventude\s+(busca|guarda))\b`,
  "i"
);


/* =========================
   NOVA FUNÇÃO
========================= */
function buildClassAmounts(cases) {
  const map = new Map();

  for (const c of cases || []) {

    const klassOriginal = (c?.process_class || "").toString().trim();
    if (!klassOriginal) continue;

    // normaliza para testar no regex
    const klassTest = stripAccentsLoose(klassOriginal).toLowerCase();

    // se bater no regex, IGNORA essa classe
    if (CLASSE_EXCLUDE_REGEX.test(klassTest)) continue;

    const klass = klassOriginal;
    const t = (c?.type || "").toString().trim().toUpperCase();
    const claim = parseMoneyToNumber(c?.claim_value);

    if (!map.has(klass)) {
      map.set(klass, { label: klass, passive: 0, active: 0 });
    }

    const row = map.get(klass);

    if (t === "PASSIVE" || t === "PASSIVO") {
      row.passive += claim;
    } else if (t === "ACTIVE" || t === "ATIVO") {
      row.active += claim;
    }
  }

  const items = Array.from(map.values())
    .filter((x) => (x.passive || 0) > 0 || (x.active || 0) > 0)
    .sort((a, b) => (b.passive + b.active) - (a.passive + a.active));

  return items.slice(0, 12);
}

function extractYearsFromMovements(caseMovements) {
  if (caseMovements == null) return [];
  const s = typeof caseMovements === "string" ? caseMovements : JSON.stringify(caseMovements);
  return s.match(/\b(19|20)\d{2}\b/g) || [];
}

function buildCasesByYear(cases) {
  const map = new Map();

  for (const c of cases || []) {
    const years = extractYearsFromMovements(c?.case_movements);
    if (!years.length) continue;

    const y = years
      .map((x) => Number(x))
      .filter((n) => isFinite(n))
      .sort((a, b) => b - a)[0];

    if (!y) continue;
    map.set(String(y), (map.get(String(y)) || 0) + 1);
  }

  const items = Array.from(map.entries())
    .map(([year, count]) => ({ label: year, value: count }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  return items;
}

/* =========================
   ✅ NOVO: contagem PASSIVA por RAMO/JURISDIÇÃO
========================= */
function normalizeJurisdictionLabel(v) {
  const s = (v == null ? "" : String(v)).trim();
  if (!s) return "SEM JURISDIÇÃO";

  let out = s.replace(/\s+/g, " ");

  const upper = out.toUpperCase();
  const aliases = new Map([
    ["CIVEL", "CÍVEL"],
    ["CÍVEL", "CÍVEL"],
    ["TRABALHISTA", "TRABALHISTA"],
    ["TRABALHO", "TRABALHISTA"],
    ["FEDERAL", "FEDERAL"],
    ["CRIMINAL", "CRIMINAL"],
    ["PENAL", "CRIMINAL"],
  ]);

  if (aliases.has(upper)) out = aliases.get(upper);

  return out;
}

function buildPassiveJurisdictionCounts(cases, { topN = 7 } = {}) {
  const map = new Map();

  for (const c of cases || []) {
    const t = (c?.type || "").toString().trim().toUpperCase();
    if (t !== "PASSIVE" && t !== "PASSIVO") continue;

    const jur = normalizeJurisdictionLabel(c?.jurisdiction);
    map.set(jur, (map.get(jur) || 0) + 1);
  }

  const all = Array.from(map.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  if (all.length <= topN) return all;

  const top = all.slice(0, topN);
  const rest = all.slice(topN);
  const restSum = rest.reduce((s, x) => s + Number(x.value || 0), 0);

  return restSum > 0 ? [...top, { label: "Outras", value: restSum }] : top;
}

/* =========================
   ✅ ENDEREÇOS (FOUND ADDRESSES)
========================= */
function getObjRaw(obj) {
  return obj?.extra?.raw || null;
}

function getObjAnalyses(obj) {
  const raw = getObjRaw(obj);
  const analyses = raw?.analyses;
  return Array.isArray(analyses) ? analyses : [];
}

function pickObjAnalysisByTitle(obj, title) {
  const analyses = getObjAnalyses(obj);
  const t = normalizeTitle(title);
  for (const a of analyses) {
    const data = a?.data;
    if (data && normalizeTitle(data.title) === t) return data;
  }
  return null;
}

function buildAddressLineFromFoundItem(it) {
  if (!it || typeof it !== "object") return "";

  const street = (it.address_main || it.address || it.street || it.logradouro || "").toString().trim();
  const num = (it.number || it.numero || "").toString().trim();
  const neighborhood = (it.neighborhood || it.bairro || "").toString().trim();
  const city = (it.city || it.municipio || it.municipality || "").toString().trim();
  const uf = (it.UF || it.uf || it.state || "").toString().trim();
  const complement = (it.complement || it.complemento || "").toString().trim();
  const zip = digitsOnly(it.zip_code || it.cep || it.postal_code || "");

  const parts = [];
  const s = [street, num].filter(Boolean).join(", ");
  if (s) parts.push(s);
  if (complement) parts.push(complement);
  if (neighborhood) parts.push(neighborhood);

  const cityUf = [city, uf].filter(Boolean).join(" - ");
  if (cityUf) parts.push(cityUf);
  if (zip) parts.push(zip);

  return parts.join(", ");
}

function buildFoundAddressesFromRegIntegrity(regObj) {
  const found = pickObjAnalysisByTitle(regObj, "FOUND ADDRESSES");

  const candidates =
    (Array.isArray(found?.addresses) && found.addresses) ||
    (Array.isArray(found?.data?.addresses) && found.data.addresses) ||
    (Array.isArray(found?.found_addresses) && found.found_addresses) ||
    (Array.isArray(found?.items) && found.items) ||
    (Array.isArray(found?.results) && found.results) ||
    null;

  if (candidates && candidates.length) return candidates;

  const raw = getObjRaw(regObj);
  const alt = (Array.isArray(raw?.addresses) && raw.addresses) || (Array.isArray(raw?.found_addresses) && raw.found_addresses) || null;

  return alt && alt.length ? alt : [];
}

function entityDisplayName(ent) {
  return ent?.razao_social || ent?.nome_fantasia || ent?.name || ent?.nome || ent?.cnpj || ent?.cpf || "Empresa";
}

function buildAddressFromEnderecoBlock(endereco) {
  if (!endereco || typeof endereco !== "object") return "";

  const full = (endereco.endereco_completo || "").toString().trim();
  if (full) return full;

  const log = (endereco.logradouro || "").toString().trim();
  const num = (endereco.numero || "").toString().trim();
  const bairro = (endereco.bairro || "").toString().trim();
  const cid = (endereco.municipio || "").toString().trim();
  const uf = (endereco.uf || "").toString().trim();
  const cep = (endereco.cep || "").toString().trim();

  const parts = [];
  const street = [log, num].filter(Boolean).join(", ");
  if (street) parts.push(street);
  if (bairro) parts.push(bairro);

  const cityUf = [cid, uf].filter(Boolean).join(" - ");
  if (cityUf) parts.push(cityUf);

  if (cep) parts.push(digitsOnly(cep));

  return parts.join(", ");
}

/* =========================
   ✅ PRO_SCORE (robusto)
========================= */
function looksLikeProScoreData(d) {
  if (!d || typeof d !== "object") return false;

  const title = normalizeTitle(d.title || "");
  if (title.includes("PROSCORE")) return true;

  if (d.type && String(d.type).toUpperCase() === "CREDIT") return true;

  if (Array.isArray(d.company_dpc) || Array.isArray(d.presumed_revenue) || Array.isArray(d.final_score_result)) return true;

  if (d.data && typeof d.data === "object") return looksLikeProScoreData(d.data);

  return false;
}

function getProScoreDataFromRaw(raw) {
  if (!raw || typeof raw !== "object") return null;

  if (raw.data && typeof raw.data === "object" && looksLikeProScoreData(raw.data)) return raw.data;

  if (Array.isArray(raw.analyses)) {
    for (const a of raw.analyses) {
      const data = a?.data;
      if (!data) continue;
      const candidate = data?.data && typeof data.data === "object" ? data.data : data;
      if (looksLikeProScoreData(candidate)) return candidate;
    }
  }

  if (looksLikeProScoreData(raw)) return raw;

  return null;
}

function getProScoreData(anyObj) {
  if (!anyObj || typeof anyObj !== "object") return null;

  const raw = getObjRaw(anyObj);
  const hit = getProScoreDataFromRaw(raw);
  if (hit) return hit;

  if (looksLikeProScoreData(anyObj)) return anyObj.data && typeof anyObj.data === "object" ? anyObj.data : anyObj;

  return null;
}

function getCompanyName(pro) {
  const a = firstObj(pro?.federal_revenue_data_business);
  return safeStr(a?.company_name) || safeStr(a?.trade_name) || safeStr(firstObj(pro?.proscore_base_name)?.found_name) || "—";
}

function getCnpjCpf(pro) {
  return safeStr(pro?._cnpj_relation || pro?._cpf_relation || "");
}

function getFinalScore(pro) {
  const r = firstObj(pro?.final_score_result);
  const code = safeStr(r?.final_score_code);
  const desc = safeStr(r?.final_score_description);
  return { code: code || "—", desc: desc || "—" };
}

function getFinalScoreNumber(pro) {
  const r = firstObj(pro?.final_score_result);
  const raw = r?.final_score_code ?? r?.score ?? r?.final_score ?? null;
  const n = Number(String(raw || "").replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
}

function getCapital(pro) {
  const r = firstObj(pro?.business_capital_federal_revenue);
  return parseMoneyToNumber(r?.capital);
}

function getPresumedRevenue(pro) {
  if (!pro) return 0;

  // 1️⃣ Prioridade: CPF with presumed income
  const rendaCpf = firstObj(pro?.cpf_with_presumed_income);
  const rendaCpfValue =
    rendaCpf?.presumed_income_value ??
    rendaCpf?.presumed_income ??
    rendaCpf?.income_value ??
    rendaCpf?.income ??
    null;

  const rendaCpfNum = parseMoneyToNumber(rendaCpfValue);
  if (rendaCpfNum > 0) return rendaCpfNum;

  // 2️⃣ Fallback: presumed_revenue (empresa)
  const r = firstObj(pro?.presumed_revenue);
  const rendaEmpresa = parseMoneyToNumber(r?.presumed_revenue_value);

  if (rendaEmpresa > 0) return rendaEmpresa;

  return 0;
}


function getReceitaStatus(pro) {
  const r = firstObj(pro?.federal_revenue_data_business);
  return {
    status: safeStr(r?.registration_status) || "—",
    opening: safeStr(r?.opening_date) || "—",
    consultation: safeStr(r?.consultation_date) || "—",
  };
}

function parseInstallmentsToNumber(s) {
  const m = String(s || "").match(/\d+/);
  return m ? Number(m[0]) : 0;
}

function buildDpcItems(pro) {
  const list = Array.isArray(pro?.company_dpc) ? pro.company_dpc : [];
  return list
    .map((x) => {
      const inst = safeStr(x?.installments);
      const instN = parseInstallmentsToNumber(inst);
      const limit = parseMoneyToNumber(x?.limit);
      const dpc = parseMoneyToNumber(x?.dpc);
      return { label: inst || "—", installmentsN: instN, limit, dpc };
    })
    .filter((x) => x.installmentsN > 0)
    .sort((a, b) => a.installmentsN - b.installmentsN);
}

function buildDpcLimitSeries(dpcItems) {
  return (dpcItems || [])
    .filter((x) => (x.installmentsN || 0) > 0)
    .map((x) => ({
      label: `${x.installmentsN}x`,
      value: Number(x.limit || 0),
      _installmentsN: x.installmentsN,
    }))
    .sort((a, b) => (a._installmentsN || 0) - (b._installmentsN || 0));
}

function getEmployeesRangeFromIndicators(pro) {
  if (!pro || typeof pro !== "object") return null;

  const indicators = pro?.business_activity_indicators || pro?.BUSINESS_ACTIVITY_INDICATORS || pro?.businessActivityIndicators || null;
  const list = Array.isArray(indicators) ? indicators : indicators && typeof indicators === "object" ? [indicators] : [];

  const norm = (k) => k.toLowerCase().replace(/\s+/g, " ").trim();

  const wanted = [
    "employees range",
    "employees_range",
    "employeesrange",
    "employee range",
    "employee_range",
    "employees",
    "employee",
    "employees count",
    "employee count",
    "number of employees",
    "qtd funcionarios",
    "funcionarios",
  ].map(norm);

  const pickKey = (obj) => {
    if (!obj || typeof obj !== "object") return null;
    const keys = Object.keys(obj);

    for (const k of keys) if (wanted.includes(norm(k))) return k;
    for (const k of keys) {
      const nk = norm(k);
      if (nk.includes("employee") || nk.includes("funcion")) return k;
    }
    return null;
  };

  for (const obj of list) {
    const k = pickKey(obj);
    if (!k) continue;
    const s = safeStr(obj[k]);
    if (s) return s;
  }

  return null;
}

/* =========================
   Dashboard
========================= */
export default function SheetDashboard({ kappiObj, regObj = null, proScoreObj = null }) {
  const raw = useMemo(() => getKappiRaw(kappiObj), [kappiObj]);
  const entities = useMemo(() => (Array.isArray(raw?.entities) ? raw.entities : []), [raw]);

  const totalCapitalSocial = useMemo(() => {
    let sum = 0;
    for (const ent of entities) {
      const v = parseMoneyToNumber(ent?.capital_social);
      if (v > 0) sum += v;
    }
    return sum;
  }, [entities]);

  const proc = useMemo(() => buildProcessTypeCounts(kappiObj), [kappiObj]);
  const alertCount = useMemo(() => sumAlertsFromLegal(proc.legal, proc.cases), [proc]);

  const claimTotals = useMemo(() => {
    const fromTotals = getLegalTotalsIfPresent(proc.legal);
    if (fromTotals) return fromTotals;
    return sumClaimsFallbackFromCases(proc.cases);
  }, [proc]);

  const byYear = useMemo(() => buildCasesByYear(proc.cases), [proc]);
  const classAmounts = useMemo(() => buildClassAmounts(proc.cases), [proc]);

  const activeClaims = claimTotals.active || 0;
  const passiveClaims = claimTotals.passive || 0;

  const passiveJurPieItems = useMemo(() => buildPassiveJurisdictionCounts(proc.cases, { topN: 7 }), [proc]);

  /* =========================
     ✅ ENDEREÇOS
  ========================= */
  const foundAddresses = useMemo(() => {
    if (regObj) return buildFoundAddressesFromRegIntegrity(regObj);
    return [];
  }, [regObj]);

  const fallbackAddressesFromEntities = useMemo(() => {
    return entities
      .map((ent, idx) => {
        const name = entityDisplayName(ent);
        const enderecoBlock = ent?.endereco || null;
        const line = buildAddressFromEnderecoBlock(enderecoBlock);
        const cep = digitsOnly(enderecoBlock?.cep || "");
        return { id: `ent-${idx}`, tipo: name || "ENTITY", line, cep: cep || "", _source: "entities.endereco" };
      })
      .filter((x) => x.line);
  }, [entities]);

  const addressRows = useMemo(() => {
    if (foundAddresses && foundAddresses.length) {
      const rows = foundAddresses
        .map((it, idx) => {
          const tipo = (
            it.type ||
            it.Tipo ||
            it.typology ||
            it.typology_code ||
            it.typologyCode ||
            it.address_type ||
            ""
          )
            .toString()
            .trim();

          const line = buildAddressLineFromFoundItem(it);
          const cep = digitsOnly(it.zip_code || it.cep || it.postal_code || "");

          return { id: `fa-${idx}`, tipo: tipo || "—", line, cep: cep || "—", _raw: it, _source: "FOUND ADDRESSES" };
        })
        .filter((r) => r.line);

      return rows;
    }
    return fallbackAddressesFromEntities;
  }, [foundAddresses, fallbackAddressesFromEntities]);

  // ✅ atualização: garante que o selectedAddressId não fique inválido quando addressRows muda
  const [selectedAddressId, setSelectedAddressId] = useState(() => addressRows[0]?.id || "");
  useEffect(() => {
    if (!addressRows.length) {
      setSelectedAddressId("");
      return;
    }
    const exists = addressRows.some((x) => x.id === selectedAddressId);
    if (!exists) setSelectedAddressId(addressRows[0].id);
  }, [addressRows, selectedAddressId]);

  const selectedAddress = useMemo(() => {
    if (!addressRows.length) return null;
    const hit = addressRows.find((x) => x.id === selectedAddressId);
    return hit || addressRows[0] || null;
  }, [addressRows, selectedAddressId]);

  const mapsUrl = useMemo(() => {
    const q = selectedAddress?.line || "";
    if (!q) return "";
    return `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  }, [selectedAddress]);

  const mapsLink = useMemo(() => {
    const q = selectedAddress?.line || "";
    if (!q) return "";
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }, [selectedAddress]);

  /* =========================
     ✅ PRO_SCORE
  ========================= */
  const pro = useMemo(() => {
    return getProScoreData(proScoreObj) || getProScoreData(regObj) || getProScoreData(kappiObj) || null;
  }, [proScoreObj, regObj, kappiObj]);

  const proCompanyName = useMemo(() => (pro ? getCompanyName(pro) : "—"), [pro]);
  const proDoc = useMemo(() => (pro ? getCnpjCpf(pro) : ""), [pro]);
  const proFinal = useMemo(() => (pro ? getFinalScore(pro) : { code: "—", desc: "—" }), [pro]);
  const proFinalNumber = useMemo(() => (pro ? getFinalScoreNumber(pro) : 0), [pro]);
  const proCapital = useMemo(() => (pro ? getCapital(pro) : 0), [pro]);
  const proPresumedRevenue = useMemo(() => (pro ? getPresumedRevenue(pro) : 0), [pro]);
  const proStatus = useMemo(() => (pro ? getReceitaStatus(pro) : null), [pro]);

  const proEmails = useMemo(() => (Array.isArray(pro?.emails_for_consulted_document) ? pro.emails_for_consulted_document : []), [pro]);
  const proPhones = useMemo(() => (Array.isArray(pro?.phone_cpf_cnpj) ? pro.phone_cpf_cnpj : []), [pro]);

  const employeesRange = useMemo(() => (pro ? getEmployeesRangeFromIndicators(pro) : null), [pro]);

  const dpcItems = useMemo(() => (pro ? buildDpcItems(pro) : []), [pro]);
  const dpcLimitSeries = useMemo(() => buildDpcLimitSeries(dpcItems), [dpcItems]);

  const dpcMaxLimit = useMemo(() => {
    let max = 0;
    for (const it of dpcItems) max = Math.max(max, Number(it.limit || 0));
    return max;
  }, [dpcItems]);

  const dpcMaxDpc = useMemo(() => {
    let max = 0;
    for (const it of dpcItems) max = Math.max(max, Number(it.dpc || 0));
    return max;
  }, [dpcItems]);

  return (
    <div className="ck-dashboard">
      {/* =========================
          Dashboard (KAPPI)
      ========================= */}
      <div className="ck-section">
        <div className="ck-rowHead">
          <div>
            <div className="ck-section__title" style={{ marginBottom: 0 }}>
              Dashboard (dados reais)
            </div>
            <div className="ck-sub" style={{ marginTop: 6 }}>
              Fonte dos totais de processos: <b>{claimTotals.source}</b>
            </div>
          </div>
        </div>

        <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
  <div className="ck-metric">
    <div className="ck-metric__k">Empresas (entities)</div>
    <div className="ck-metric__v">{entities.length}</div>
  </div>

  <div className="ck-metric">
    <div className="ck-metric__k">Patrimônio total (capital social)</div>
    <div className="ck-metric__v">{formatBRL(totalCapitalSocial)}</div>
  </div>

  <div className="ck-metric">
    <div className="ck-metric__k">Renda presumida</div>
    <div className="ck-metric__v">{formatBRL(proPresumedRevenue)}</div>
  </div>

  <div className="ck-metric">
    <div className="ck-metric__k">Classe social</div>
    <div className="ck-metric__v">
      {(() => {
        const cls = pro?.presumed_social_class?.[0];
        if (!cls) return "—";
        const code = cls.social_class ?? cls.class ?? cls.code ?? "";
        const desc = cls.social_class_description ?? cls.description ?? "";
        if (code && desc) return `Classe ${code} — ${desc}`;
        return code ? `Classe ${code}` : (desc || "—");
      })()}
    </div>
  </div>
</div>


        <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
          <div className="ck-metric">
            <div className="ck-metric__k">Passivo processos</div>
            <div className="ck-metric__v">{formatBRL(passiveClaims)}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Ativo (a receber)</div>
            <div className="ck-metric__v">{formatBRL(activeClaims)}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Saldo (ativo - passivo)</div>
            <div className="ck-metric__v">{formatBRL(activeClaims - passiveClaims)}</div>
          </div>

          <div className="ck-metric">
            <div className="ck-metric__k">Capital social médio</div>
            <div className="ck-metric__v">{entities.length ? formatBRL(totalCapitalSocial / entities.length) : "—"}</div>
          </div>
        </div>
      </div>

      <div className="ck-grid2">
        <div className="ck-section">
          <div className="ck-section__title">Processos por ano (real)</div>
          <AreaLineChart title="Processos por ano" items={byYear.length ? byYear : []} />
          {!byYear.length ? (
            <div className="ck-empty" style={{ marginTop: 8 }}>
              Sem dados suficientes para gráfico.
            </div>
          ) : null}
        </div>

        {/* =========================
    Resumo financeiro de crédito
========================= */}
<div className="ck-section">
  {/* =========================
    Resumo de tramitação (últimos 6/12/18 meses)
========================= */}
<div className="ck-section">
  <div className="ck-section__title">Resumo de tramitação</div>

  {(!proc?.cases || !proc.cases.length) ? (
    <div className="ck-empty">Sem casos para calcular tramitação.</div>
  ) : (
    (() => {
      const counts = buildInTramitacaoCounts(proc.cases);

      return (
        <>
          <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
            <div className="ck-metric">
              <div className="ck-metric__k">Em tramitação (últimos 6 meses)</div>
              <div className="ck-metric__v">{counts.last6}</div>
            </div>

            <div className="ck-metric">
              <div className="ck-metric__k">Em tramitação (últimos 12 meses)</div>
              <div className="ck-metric__v">{counts.last12}</div>
            </div>

            <div className="ck-metric">
              <div className="ck-metric__k">Em tramitação (últimos 18 meses)</div>
              <div className="ck-metric__v">{counts.last18}</div>
            </div>

            <div className="ck-metric">
              <div className="ck-metric__k">Total de processos</div>
              <div className="ck-metric__v">{proc.cases.length}</div>
            </div>
          </div>
        </>
      );
    })()
  )}
</div>

  {!pro ? (
  <div className="ck-empty">Sem dados de PRO_SCORE para este documento.</div>
) : (
  (() => {
    const data = pro;

    const baseName = data?.proscore_base_name?.[0];
    const ccf = data?.ccf_passage_registration_721_to_1830_days?.[0];
    const renda = data?.cpf_with_presumed_income?.[0];
    const classe = data?.presumed_social_class?.[0];
    const death = data?.synthetic_death_data?.[0];

    // ✅ NOVO: antecedentes criminais (Polícia Federal) — robusto
    const pf =
      data?.criminal_records_federal_police?.[0] ||
      data?.federal_police_criminal_records?.[0] ||
      data?.pf_criminal_records?.[0] ||
      data?.antecedentes_criminais_policia_federal?.[0] ||
      data?.policia_federal_antecedentes_criminais?.[0] ||
      null;

    function boolFromAny(v) {
      // aceita: true/false, "SIM"/"NAO", "S"/"N", "1"/"0", number
      if (v === true) return true;
      if (v === false) return false;
      if (typeof v === "number") return v > 0;
      const s = String(v ?? "").trim().toUpperCase();
      if (!s) return null;
      if (["SIM", "S", "TRUE", "1", "YES"].includes(s)) return true;
      if (["NAO", "NÃO", "N", "FALSE", "0", "NO"].includes(s)) return false;
      return null;
    }

    function pfHasCriminalRecord(pfObj) {
      if (!pfObj || typeof pfObj !== "object") return null;

      // tenta achar um "flag" direto
      const direct =
        pfObj.has_criminal_record ??
        pfObj.has_record ??
        pfObj.has_occurrence ??
        pfObj.has_occurrences ??
        pfObj.hasAntecedente ??
        pfObj.antecedente ??
        pfObj.antecedentes ??
        pfObj.found ??
        pfObj.found_occurrences ??
        pfObj.listed ??
        pfObj.listed_in_database ??
        pfObj.listed_in_pf_database ??
        pfObj.listed_in_police_database ??
        null;

      const b1 = boolFromAny(direct);
      if (b1 !== null) return b1;

      // se vier contagem
      const count =
        pfObj.occurrence_count ??
        pfObj.occurrences_count ??
        pfObj.records_count ??
        pfObj.total_occurrences ??
        pfObj.total ??
        null;

      const n = Number(String(count ?? "").replace(/[^\d.-]/g, ""));
      if (Number.isFinite(n)) return n > 0;

      // se vier lista
      const list =
        pfObj.occurrences ||
        pfObj.records ||
        pfObj.items ||
        pfObj.results ||
        pfObj.data;

      if (Array.isArray(list)) return list.length > 0;

      return null;
    }

    const pfStatusBool = pfHasCriminalRecord(pf);
    const pfLabel =
      pfStatusBool === null ? "—" : pfStatusBool ? "Sim" : "Não";

    const pfDetails =
      pf?.description ||
      pf?.message ||
      pf?.status_description ||
      pf?.observation ||
      "";

    return (
      <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
        {/* ✅ 1) Proscore Base Name primeiro */}
        <div className="ck-metric">
          <div className="ck-metric__k">Proscore Base Name</div>
          <div className="ck-metric__v">{baseName?.found_name || "—"}</div>
        </div>

        {/* ✅ 2) NOVO: Antecedentes criminais PF */}
        <div className="ck-metric">
          <div className="ck-metric__k">Antecedentes criminais — Polícia Federal</div>
          <div className="ck-metric__v">{pfLabel}</div>
          {pfDetails ? <div className="ck-smallNote">{pfDetails}</div> : null}
        </div>

        <div className="ck-metric">
          <div className="ck-metric__k">CCF (721–1830 dias)</div>
          <div className="ck-metric__v">
            {ccf ? `${ccf.occurrence_count} ocorrência(s)` : "—"}
          </div>
          <div className="ck-smallNote">{ccf?.passage_description || ""}</div>
        </div>
        <div className="ck-metric">
          <div className="ck-metric__k">Synthetic Death Data</div>
          <div className="ck-metric__v">
            {death
              ? String(death.listed_in_death_database).toUpperCase() === "NAO"
                ? "Não"
                : "Sim"
              : "—"}
          </div>
        </div>
      </div>
    );
  })()
)}

</div>

      </div>

      {/* ✅ “Classe processual (passivo x ativo)” */}
      <div className="ck-span2">
        <AbbrevGroupedBars
          title="Classe processual (passivo x ativo)"
          subtitle="Somatório por classe (com base em claim_value) — siglas no eixo X + legenda à direita"
          items={classAmounts}
        />
        {!classAmounts.length ? (
          <div className="ck-empty" style={{ marginTop: 8 }}>
            Sem valores de claim_value suficientes.
          </div>
        ) : null}
      </div>

      {/* =========================
          ✅ PRO_SCORE (KPIs + gráficos)
      ========================= */}
      <div className="ck-section">
        <div className="ck-section__title">PRO_SCORE (KPIs + gráficos)</div>

        {!pro ? (
          <div className="ck-empty">Sem dados de PRO_SCORE para este documento.</div>
        ) : (
          <>
            <div className="ck-smallNote" style={{ marginTop: 6 }}>
              <b>{proCompanyName}</b> {proDoc ? <span style={{ opacity: 0.7 }}>• Doc: {proDoc}</span> : null}
            </div>

            <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
              <div className="ck-metric">
                <div className="ck-metric__k">Final score</div>
                <div className="ck-metric__v">
                  {proFinal.code} <span style={{ fontSize: 14, fontWeight: 800, opacity: 0.7 }}>({proFinal.desc})</span>
                </div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">Número de funcionários</div>
                <div className="ck-metric__v">{employeesRange ? employeesRange : "—"}</div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">Capital Social</div>
                <div className="ck-metric__v">{formatBRL(proCapital)}</div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">Receita presumida</div>
                <div className="ck-metric__v">{formatBRL(proPresumedRevenue)}</div>
              </div>
            </div>

            <div className="ck-metrics ck-metrics--4" style={{ marginTop: 10 }}>
              <div className="ck-metric">
                <div className="ck-metric__k">Status Receita</div>
                <div className="ck-metric__v">{proStatus?.status || "—"}</div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">Abertura</div>
                <div className="ck-metric__v">{proStatus?.opening || "—"}</div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">E-mails</div>
                <div className="ck-metric__v">{proEmails.length}</div>
              </div>

              <div className="ck-metric">
                <div className="ck-metric__k">Telefones</div>
                <div className="ck-metric__v">{proPhones.length}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <ScoreGradientBar
                  title="Score (0 a 1000)"
                  value={proFinalNumber}
                  min={0}
                  max={1000}
                  subtitle="Escala do final_score_result.final_score_code"
                  rightLabel={proFinal.desc || ""}
                />

                <div
                  className="ck-chart"
                  style={{
                    padding: 14,
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 14,
                    background: "#fff",
                  }}
                >
                  <div className="ck-chart__head">
                    <div className="ck-chart__title">Limite por parcelas (company_dpc)</div>
                    <div className="ck-chart__sub">Eixo X = parcelas • Eixo Y = limite (R$)</div>
                  </div>

                  <div className="ck-smallNote" style={{ marginTop: 8 }}>
                    Maior limite: <b>{formatBRL(dpcMaxLimit)}</b> • DPC máx: <b>{formatBRL(dpcMaxDpc)}</b>
                  </div>

                  {dpcLimitSeries.length ? (
                    <MoneyAreaLineChart title="Limite por parcelas" items={dpcLimitSeries} />
                  ) : (
                    <div className="ck-empty" style={{ marginTop: 10 }}>
                      Sem dados suficientes para este gráfico.
                    </div>
                  )}
                </div>
              </div>

              <div>
                {passiveJurPieItems.length ? (
                  <PiePassiveJurisdictions title="Processos passivos por Ramo / Jurisdição" items={passiveJurPieItems} />
                ) : (
                  <div className="ck-empty" style={{ padding: 14 }}>
                    Sem processos passivos com <code>jurisdiction</code> no payload.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* =========================
          ✅ Endereços + tabela + mapa
      ========================= */}
      <div className="ck-section">
        <div className="ck-section__title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>Endereços (FOUND ADDRESSES)</span>
          {mapsLink ? (
            <a className="ck-link" href={mapsLink} target="_blank" rel="noreferrer">
              Abrir no Google Maps
            </a>
          ) : null}
        </div>

        {!addressRows.length ? (
          <div className="ck-empty">Sem endereços no payload (FOUND ADDRESSES / entities.endereco).</div>
        ) : (
          <div
            className="ck-mapRow"
            style={{
              display: "grid",
              gridTemplateColumns: "520px 1fr",
              gap: 16,
              alignItems: "stretch",
              minHeight: 520,
              marginTop: 10,
            }}
          >
            {/* Tabela */}
            <div className="ck-aiBox" style={{ minHeight: 520 }}>
              <div className="ck-aiTitle" style={{ fontSize: 14 }}>
                Endereços encontrados
              </div>
              <div className="ck-aiSub" style={{ marginTop: 6, fontSize: 12 }}>
                Escolha 1 endereço para carregar o mapa ao lado.
              </div>

              <div style={{ marginTop: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "190px 1fr 100px",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(60, 120, 216, 0.10)",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  <div>Tipo</div>
                  <div>Endereço</div>
                  <div style={{ textAlign: "right" }}>CEP</div>
                </div>

                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {addressRows.map((row) => {
                    const isActive = selectedAddress?.id === row.id;

                    return (
                      <div
                        key={row.id}
                        onClick={() => setSelectedAddressId(row.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setSelectedAddressId(row.id);
                        }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "190px 1fr 100px",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 12,
                          cursor: "pointer",
                          border: isActive ? "2px solid #3C78D8" : "1px solid rgba(0,0,0,0.08)",
                          background: isActive ? "rgba(60, 120, 216, 0.06)" : "#fff",
                          fontSize: 12,
                          alignItems: "start",
                        }}
                        title={row.line}
                      >
                        <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{row.tipo || "—"}</div>

                        <div
                          style={{
                            fontWeight: 800,
                            lineHeight: 1.25,
                            whiteSpace: "normal",
                            overflow: "visible",
                            wordBreak: "break-word",
                          }}
                        >
                          {row.line}
                        </div>

                        <div style={{ textAlign: "right", fontWeight: 900, lineHeight: 1.2 }}>{row.cep || "—"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ck-smallNote" style={{ marginTop: 10, fontSize: 11 }}>
                Fonte: <b>{selectedAddress?._source || "—"}</b>
              </div>
            </div>

            {/* Mapa */}
            <div
              className="ck-map"
              style={{
                width: "100%",
                height: "100%",
                minHeight: 520,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {mapsUrl ? (
                <iframe
                  title="Mapa"
                  src={mapsUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: 0,
                  }}
                  allowFullScreen
                />
              ) : (
                <div className="ck-empty" style={{ height: "100%", display: "grid", placeItems: "center" }}>
                  Selecione um endereço para ver no mapa.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
