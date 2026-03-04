// src/pages/consulta_individual/index.jsx
import React from "react";

// Importa o CSS do template grande (se você quiser manter o mesmo visual)
// Se já está sendo importado dentro do componente grande, pode remover esta linha.
import "../../components/consulta_individual/index.css";

// Importa o "código enorme" que já existe hoje:
import ConsultaIndividualTemplate from "../../components/consulta_individual";

export default function ConsultaIndividualPage({ refreshKey = 0, initialDoc = "" }) {
  // só repassa as props — o template grande já faz o auto-consultar via useEffect(initialDoc)
  return (
    <div className="page__full">
      <ConsultaIndividualTemplate refreshKey={refreshKey} initialDoc={initialDoc} />
    </div>
  );
}