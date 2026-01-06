import {
  ShieldX,
  Landmark,
  Vote,
  Fingerprint,
  Newspaper,
  BarChart3,
} from "lucide-react";

export function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

export function isPlainObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

export function normalizeTitle(t) {
  return (t || "").toString().trim().toUpperCase().replace(/\s+/g, " ");
}

export function getKappiRaw(kappiObj) {
  return kappiObj?.extra?.raw || null;
}

export function getKappiAnalyses(kappiObj) {
  const raw = getKappiRaw(kappiObj);
  const analyses = raw?.analyses;
  return Array.isArray(analyses) ? analyses : [];
}

export function pickAnalysisByTitle(analyses, title) {
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
export function findStatusDeep(obj, maxDepth = 4) {
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

export function isIndeterminadoStatus(analysisData) {
  const s = (findStatusDeep(analysisData) || "").toString().trim().toUpperCase();
  return s === "INDETERMINADO";
}

/* =========================
   Ícones por análise
========================= */
export function analysisIconFor(title) {
  const t = normalizeTitle(title);

  if (t === "SANCTIONS AND RESTRICTIONS") return ShieldX;
  if (t === "FEDERAL REVENUE STATUS") return Landmark;
  if (t === "ELECTORAL DONORS") return Vote;
  if (t === "CRIMINAL BACKGROUND - FEDERAL POLICE") return Fingerprint;
  if (t === "NEGATIVE MEDIA") return Newspaper;

  return BarChart3;
}

/* =========================
   Bolinha de "tem dado?"
========================= */
export function hasTabData(kappiObj, tabKey) {
  if (!kappiObj) return false;

  const raw = getKappiRaw(kappiObj);
  const analyses = getKappiAnalyses(kappiObj);

  if (tabKey === "DASHBOARD") return true;

  if (tabKey === "DADOS") {
    const ents = Array.isArray(raw?.entities) ? raw.entities : [];
    return ents.length > 0;
  }

  if (tabKey === "ANALISES") {
    const list = analyses
      .map((a) => a?.data)
      .filter(Boolean)
      .filter((d) => normalizeTitle(d.title) !== "LEGAL PROCESS");
    return list.length > 0;
  }

  if (tabKey === "PROCESSOS") {
    const legal = pickAnalysisByTitle(analyses, "LEGAL PROCESS");
    const cases = Array.isArray(legal?.case_lists_by_document) ? legal.case_lists_by_document : [];
    return cases.length > 0;
  }

  if (tabKey === "CREDITO") return false;
  if (tabKey === "AMBIENTAL") return false;
  if (tabKey === "INTEGRIDADE") return false;

  return false;
}
