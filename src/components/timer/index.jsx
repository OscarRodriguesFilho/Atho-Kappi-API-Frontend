import React, { useEffect, useMemo, useRef, useState } from "react";
import "./index.css";

function lsBool(key) {
  return localStorage.getItem(key) === "1";
}

function formatMMSS(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function calcSecondsFromToggles() {
  let total = 0;

  if (lsBool("auto_kappi")) total += 3 * 60;       // +3min
  if (lsBool("auto_analise")) total += 30;         // +30s
  if (lsBool("auto_sinqia")) total += 90;          // +1:30
  if (lsBool("auto_email")) total += 60;           // +1min

  // evita 0 (sem tempo => sem rotação)
  if (total <= 0) total = 5; // mínimo só pra “rodar” e mostrar que iniciou

  return total;
}

export default function Timer() {
  const [totalSeconds, setTotalSeconds] = useState(() => calcSecondsFromToggles());
  const [secondsLeft, setSecondsLeft] = useState(() => calcSecondsFromToggles());
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const elapsed = totalSeconds - secondsLeft;
  const progress = totalSeconds <= 0 ? 0 : Math.min(1, Math.max(0, elapsed / totalSeconds));
  const angle = progress * 360;

  const mmss = useMemo(() => formatMMSS(secondsLeft), [secondsLeft]);

  const statusLabel = useMemo(() => {
    if (secondsLeft === 0) return "Finalizado";
    if (running) return "Processando...";
    return "Aguardando upload";
  }, [secondsLeft, running]);

  const badge = useMemo(() => formatMMSS(totalSeconds), [totalSeconds]);

  function startNowWithRecalc() {
    const nextTotal = calcSecondsFromToggles();
    setTotalSeconds(nextTotal);
    setSecondsLeft(nextTotal);
    setRunning(true);
  }

  function stop() {
    setRunning(false);
  }

  function reset() {
    const nextTotal = calcSecondsFromToggles();
    setTotalSeconds(nextTotal);
    setSecondsLeft(nextTotal);
    setRunning(false);
  }

  // ✅ começa automaticamente ao receber o evento disparado pelo Upload
  useEffect(() => {
    const onUploadStarted = () => {
      startNowWithRecalc();
    };

    window.addEventListener("kappi:upload_started", onUploadStarted);
    return () => window.removeEventListener("kappi:upload_started", onUploadStarted);
  }, []);

  // tick do timer
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!running) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);

          // beep curto (opcional)
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 880;
            gain.gain.value = 0.06;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            setTimeout(() => {
              osc.stop();
              ctx.close();
            }, 250);
          } catch (e) {}

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const isDone = secondsLeft === 0;

  return (
    <div className="chrono-card">
      <div className="chrono-head">
        <div className="chrono-title">Cronômetro</div>
        <div className="chrono-badge">{badge}</div>
      </div>

      <div className={`chrono ${isDone ? "is-done" : ""}`}>
        <div className="chrono-dial" aria-hidden="true">
          <div className="chrono-ticks chrono-ticks--major" />
          <div className="chrono-ticks chrono-ticks--minor" />

          <div className="chrono-center">
            <div className={`chrono-center__time ${isDone ? "is-done" : ""}`}>
              {mmss}
            </div>
            <div className={`chrono-center__sub ${isDone ? "is-done" : ""}`}>
              {statusLabel}
            </div>
          </div>

          <div className="chrono-hand" style={{ transform: `rotate(${angle}deg)` }}>
            <div className="chrono-hand__bar" />
            <div className="chrono-hand__tip" />
          </div>

          <div className="chrono-pivot" />
        </div>
      </div>

      <div className="chrono-actions">
        {!running ? (
          <button className="chrono-btn chrono-btn--primary" onClick={startNowWithRecalc}>
            Iniciar
          </button>
        ) : (
          <button className="chrono-btn chrono-btn--warn" onClick={stop}>
            Pausar
          </button>
        )}

        <button className="chrono-btn chrono-btn--ghost" onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
