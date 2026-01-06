// src/pages/consulta_individual.jsx
import React from "react";
import ConsultaIndividual from "../components/consulta_individual";

export default function ConsultaIndividualPage({ refreshKey = 0 }) {
  return (
    <div className="page__full">
      <ConsultaIndividual refreshKey={refreshKey} />
    </div>
  );
}
