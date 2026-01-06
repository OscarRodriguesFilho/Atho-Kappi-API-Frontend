import React, { useMemo } from "react";

// ✅ Ícones (os mesmos do seu script)
import {
  UserRound,
  BarChart3,
  Scale,
  CreditCard,
  Leaf,
  BadgeCheck,
} from "lucide-react";

import { hasTabData } from "./utils/kappi";

export default function KappiNavbar({ current, setCurrent, kappiObj }) {
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
        const hasData = hasTabData(kappiObj, it.key);
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
