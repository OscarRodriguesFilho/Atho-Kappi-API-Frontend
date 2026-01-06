import React, { useMemo } from "react";
import "./index.css";

/* =========================
   Ícones (SVG)
========================= */
function IconHome(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
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
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path d="M4 13a8 8 0 1 1 16 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 13l4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 19h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconBuilding(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path
        d="M4 21h16M6 21V7l6-3 6 3v14M9 10h2M9 13h2M9 16h2M13 10h2M13 13h2M13 16h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
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

/* =========================
   Dock flutuante
========================= */
export default function Sidebar({ activeKey = "home", onNavigate }) {
  const items = useMemo(
    () => [
      { key: "home", label: "Home", icon: <IconHome /> },
      { key: "atho", label: "Atho", icon: <IconBuilding /> },
      { key: "dash", label: "Dashboard", icon: <IconDashboard /> },

      // ✅ TROCA AQUI:
      { key: "consulta", label: "Consulta Individual", icon: <IconSearch /> },
    ],
    []
  );

  function go(key) {
    if (typeof onNavigate === "function") onNavigate(key);
  }

  return (
    <aside className="fdock" aria-label="Dock lateral">
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <button
            key={it.key}
            type="button"
            className={`fdock-item ${active ? "is-active" : ""}`}
            title={it.label}
            aria-label={it.label}
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
