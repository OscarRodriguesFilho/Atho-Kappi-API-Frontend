import React, { useEffect, useState } from "react";
import "./index.css";

export default function Automatizacoes() {
  const [autoKappi, setAutoKappi] = useState(false);
  const [autoAnalise, setAutoAnalise] = useState(false);
  const [autoSinqia, setAutoSinqia] = useState(false);
  const [autoEmail, setAutoEmail] = useState(false);

  useEffect(() => {
    const k = localStorage.getItem("auto_kappi");
    const a = localStorage.getItem("auto_analise");
    const s = localStorage.getItem("auto_sinqia");
    const e = localStorage.getItem("auto_email");

    setAutoKappi(k === "1");
    setAutoAnalise(a === "1");
    setAutoSinqia(s === "1");
    setAutoEmail(e === "1");
  }, []);

  function onToggle(key, nextValue, setter) {
    setter(nextValue);
    localStorage.setItem(key, nextValue ? "1" : "0");
  }

  return (
    <div className="automacao-wrap">
      <div className="card card-compact automacao-card">
        <div className="card-header fw-bold">Automatização</div>

        <div className="card-body">
          <div className="small-muted mb-2">
            Esses toggles controlam o <b>modo automático</b> </div>

          <div className="auto-row">
            <div className="auto-text">
              <div className="auto-label">Kappi</div>
              <div className="auto-sub">Ligar/desligar fluxo automático</div>
            </div>

            <label className="ios-switch" title="Automatização Kappi">
              <input
                type="checkbox"
                id="auto_kappi"
                checked={autoKappi}
                onChange={(ev) =>
                  onToggle("auto_kappi", ev.target.checked, setAutoKappi)
                }
              />
              <span className="ios-slider"></span>
            </label>
          </div>

          <div className="auto-row">
            <div className="auto-text">
              <div className="auto-label">Análise</div>
              <div className="auto-sub">Ligar/desligar fluxo automático</div>
            </div>

            <label className="ios-switch" title="Automatização Análise">
              <input
                type="checkbox"
                id="auto_analise"
                checked={autoAnalise}
                onChange={(ev) =>
                  onToggle("auto_analise", ev.target.checked, setAutoAnalise)
                }
              />
              <span className="ios-slider"></span>
            </label>
          </div>

          <div className="auto-row">
            <div className="auto-text">
              <div className="auto-label">Sinqia</div>
              <div className="auto-sub">Ligar/desligar fluxo automático</div>
            </div>

            <label className="ios-switch" title="Automatização Sinqia">
              <input
                type="checkbox"
                id="auto_sinqia"
                checked={autoSinqia}
                onChange={(ev) =>
                  onToggle("auto_sinqia", ev.target.checked, setAutoSinqia)
                }
              />
              <span className="ios-slider"></span>
            </label>
          </div>

          <div className="auto-row">
            <div className="auto-text">
              <div className="auto-label">E-mail</div>
              <div className="auto-sub">Ligar/desligar fluxo automático</div>
            </div>

            <label className="ios-switch" title="Automatização E-mail">
              <input
                type="checkbox"
                id="auto_email"
                checked={autoEmail}
                onChange={(ev) =>
                  onToggle("auto_email", ev.target.checked, setAutoEmail)
                }
              />
              <span className="ios-slider"></span>
            </label>
          </div>

          <div className="small-muted mt-2" id="auto_hint">
      
          </div>
        </div>
      </div>
    </div>
  );
}
