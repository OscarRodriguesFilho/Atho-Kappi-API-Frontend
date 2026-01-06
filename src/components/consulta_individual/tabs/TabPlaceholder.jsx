import React from "react";

export default function TabPlaceholder({ title, subtitle }) {
  return (
    <div className="ck-section">
      <div className="ck-section__title">{title}</div>
      <div className="ck-empty">{subtitle || "Aba criada (sem informações por enquanto)."}</div>
    </div>
  );
}
