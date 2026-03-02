import React, { useMemo } from "react";
import "./index.css";

/* =========================
   Ícones (SVG)
========================= */

function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        d="M4 11.5L12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconDashboard(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        d="M4 13a8 8 0 1 1 16 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 13l4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M16.5 16.5L21 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* 🔥 Ícone de Histórico (relógio com seta) */
function IconHistory(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      {/* seta de retorno */}
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* ponteiros do relógio */}
      <path
        d="M12 7v6l4 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================
   Sidebar
========================= */

export default function Sidebar({ activeKey = "home", onNavigate }) {
  const items = useMemo(
    () => [
      { key: "home", label: "Home", icon: <IconHome /> },
      { key: "dash", label: "Dashboard", icon: <IconDashboard /> },
      { key: "historico", label: "Histórico", icon: <IconHistory /> },
      { key: "consulta", label: "Consulta Individual", icon: <IconSearch /> },
    ],
    []
  );

  function go(key) {
    if (typeof onNavigate === "function") onNavigate(key);
  }

  return (
    <aside className="fdock">
      {items.map((it) => {
        const active = it.key === activeKey;

        return (
          <button
            key={it.key}
            type="button"
            className={`fdock-item ${active ? "is-active" : ""}`}
            onClick={() => go(it.key)}
          >
            <span className="fdock-ico">{it.icon}</span>
            <span className="fdock-label">{it.label}</span>
          </button>
        );
      })}
    </aside>
  );
}