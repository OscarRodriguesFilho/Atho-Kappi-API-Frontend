import React from "react";
import { BarChart3, Play } from "lucide-react";

import {
  getKappiAnalyses,
  normalizeTitle,
  analysisIconFor,
  isIndeterminadoStatus,
  isPlainObject,
} from "../utils/kappi";

import { translateTitle, translateType, formatValue } from "../utils/translate";

export default function TabAnalises({ kappiObj, onOpenDrawer }) {
  const analyses = getKappiAnalyses(kappiObj);

  // ✅ remove "LEGAL PROCESS" daqui
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
          const Icon = analysisIconFor(head.title) || BarChart3;

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
                  onOpenDrawer?.({
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
