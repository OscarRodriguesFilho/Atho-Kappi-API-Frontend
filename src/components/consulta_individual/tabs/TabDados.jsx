import React from "react";
import KeyValueTable from "../KeyValueTable";
import { getKappiRaw } from "../utils/kappi";

export default function TabDados({ kappiObj }) {
  const raw = getKappiRaw(kappiObj);
  if (!raw) return <div className="ck-empty">Sem dados</div>;

  return (
    <div className="ck-section">
      <div className="ck-section__title">Dados pessoais</div>
      <KeyValueTable data={raw.entities || null} />
    </div>
  );
}
