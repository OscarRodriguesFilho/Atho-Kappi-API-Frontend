import React from "react";
import "./index.css";

export default function Regras() {
  return (
    <section className="regras-root">
      <div className="regras-card">
        <div className="regras-card-header">Crietérios de avalização</div>

        <div className="regras-card-body">
          <ol className="regras-list">
            <li className="regras-item">
              <span className="regras-num">0º</span>
              <span className="regras-text">
                <b>IS DEAD = TRUE</b> = <b>REPROVAÇÃO AUTOMÁTICA</b>
              </span>
              <span className="regras-pill regras-pill-danger">REPROVA</span>
            </li>

            <li className="regras-item">
              <span className="regras-num">1º</span>
              <span className="regras-text">
                <b>NÂO POSSUI ATIVO</b>, <b>JUIZADO ESPECIAL CIVIL</b> e <b>EM TRAMITAÇÃO</b>
              </span>
              <span className="regras-pill regras-pill-warn">ALERTA</span>
            </li>

            <li className="regras-item">
              <span className="regras-num">2º</span>
              <span className="regras-text">
                <b>MAIS DE UM</b> igual do item 1
              </span>
              <span className="regras-pill regras-pill-warn">ALERTA</span>
            </li>

            <li className="regras-item">
              <span className="regras-num">3º</span>
              <span className="regras-text">
                <b>5 OU +</b> processos de <b>JEC</b> em <b>ATIVO</b>
              </span>
              <span className="regras-pill regras-pill-warn">ALERTA</span>
            </li>

            <li className="regras-item">
              <span className="regras-num">4º</span>
              <span className="regras-text">
                <b>CRIMINAL</b> e <b>PASSIVO</b> = <b>ANTECEDENTE CRIMINAL</b>
              </span>
              <span className="regras-pill regras-pill-warn">ALERTA</span>
            </li>

            <li className="regras-item">
              <span className="regras-num">5º</span>
              <span className="regras-text">
                <b>INDETERMINADO</b> e <b>SANSÃO</b> no processo criminal
              </span>
              <span className="regras-pill regras-pill-warn">ALERTA</span>
            </li>
          </ol>

         
        </div>
      </div>
    </section>
  );
}
