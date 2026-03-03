// src/components/upload/index.jsx
import React, { useRef, useState, useEffect } from "react";
import "./index.css";

export default function Upload({ onUploadSuccess }) {
  // ✅ padroniza base via .env (e fallback em localhost)
  const BACKEND_BASE =
    (import.meta?.env?.VITE_BACKEND_BASE || "").trim() || "http://localhost:5502";

  const UPLOAD_URL = `${BACKEND_BASE}/upload_processar_csv`;

  const fileRef = useRef(null);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("Escolha um arquivo...");

  // ✅ tooltip flutuante (na tela toda)
  const helpDotRef = useRef(null);
  const popRef = useRef(null);

  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPos, setHelpPos] = useState({ top: 0, left: 0 });

  function resetFile() {
    if (fileRef.current) fileRef.current.value = "";
    setFileName("Escolha um arquivo...");
  }

  function onPickFile() {
    if (!loading) fileRef.current?.click();
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    setFileName(f ? f.name : "Escolha um arquivo...");
  }

  function _lsBool(key) {
    return localStorage.getItem(key) === "1";
  }

  function positionHelpPopover() {
    const dot = helpDotRef.current;
    const pop = popRef.current;
    if (!dot || !pop) return;

    const r = dot.getBoundingClientRect();
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;

    const gap = 10;
    const pad = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // ✅ ABRIR SUPERIOR DIREITA:
    // popover fica acima do dot, e começa à direita do dot
    let left = r.right + gap;
    let top = r.top - popH - gap;

    // clamp horizontal/vertical (sem mudar o "lado", só evitando sair da tela)
    if (left + popW > vw - pad) left = vw - popW - pad;
    if (left < pad) left = pad;

    if (top < pad) top = pad;
    if (top + popH > vh - pad) top = vh - popH - pad;

    setHelpPos({ top, left });
  }

  function openHelp() {
    setHelpOpen(true);
  }

  function closeHelp() {
    setHelpOpen(false);
  }

  // ✅ posiciona depois que o popover renderizar (tamanho real)
  useEffect(() => {
    if (!helpOpen) return;

    const raf = requestAnimationFrame(() => {
      positionHelpPopover();
    });

    const onScroll = () => positionHelpPopover();
    const onResize = () => positionHelpPopover();

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [helpOpen]);

  async function onSubmit(e) {
    e.preventDefault();

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ type: "danger", message: "Arquivo não enviado." });
      return;
    }

    setLoading(true);
    setStatus({ type: "info", message: "Enviando e processando..." });

    try {
      const auto_kappi = _lsBool("auto_kappi");
      const auto_analise = _lsBool("auto_analise");
      const auto_sinqia = _lsBool("auto_sinqia");
      const auto_email = _lsBool("auto_email");

      const fd = new FormData();
      fd.append("csv_file", file);

      fd.append("auto_kappi", auto_kappi ? "1" : "0");
      fd.append("auto_analise", auto_analise ? "1" : "0");
      fd.append("auto_sinqia", auto_sinqia ? "1" : "0");
      fd.append("auto_email", auto_email ? "1" : "0");

      const resp = await fetch(UPLOAD_URL, {
        method: "POST",
        body: fd,
        credentials: "include", // ✅ ESSENCIAL: envia access_token_cookie
      });

      // ✅ token ausente/expirado (flask_jwt_extended costuma usar 401/422)
      if (resp.status === 401 || resp.status === 422) {
        const txt = await resp.text().catch(() => "");
        let msg = "Sessão expirada ou não autenticado. Faça login novamente.";
        try {
          const j = JSON.parse(txt);
          if (j?.msg) msg = j.msg;
          if (j?.error) msg = j.error;
        } catch {
          if (txt) msg = txt;
        }

        setStatus({
          type: "danger",
          message: `HTTP ${resp.status} — ${msg}`,
        });
        return;
      }

      const text = await resp.text().catch(() => "");

      if (!resp.ok) {
        setStatus({
          type: "danger",
          message: `Erro ao enviar/processar no servidor 5502: ${resp.status} - ${
            text || "sem resposta"
          }`,
        });
        return;
      }

      setStatus({
        type: "success",
        message:
          "CSV enviado e processado com sucesso no servidor 5502. " +
          `(auto: kappi=${auto_kappi ? "on" : "off"}, ` +
          `analise=${auto_analise ? "on" : "off"}, ` +
          `sinqia=${auto_sinqia ? "on" : "off"}, ` +
          `email=${auto_email ? "on" : "off"})`,
      });

      resetFile();
      onUploadSuccess?.();
    } catch (err) {
      setStatus({
        type: "danger",
        message: `Erro no upload/processamento: ${err?.message || String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  }

  function closeAlert() {
    setStatus(null);
  }

  return (
    <section className="upload-root">
      {status && (
        <div className="upload-alert-wrap">
          <div className={`upload-alert upload-alert-${status.type}`}>
            <div className="upload-alert-text">{status.message}</div>
            <button
              type="button"
              className="upload-alert-close"
              onClick={closeAlert}
              aria-label="Close"
              title="Fechar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="upload-card">
        <div className="upload-card-header">
          <span>Upload e Processamento de CSV</span>

          {/* ✅ bolinha "!" */}
          <span
            className="upload-help"
            onMouseEnter={openHelp}
            onMouseLeave={closeHelp}
          >
            <span
              ref={helpDotRef}
              className="upload-help-dot"
              aria-label="Ajuda"
            >
              !
            </span>
          </span>
        </div>

        {/* ✅ Popover FIXO + setinha */}
        {helpOpen && (
          <div
            ref={popRef}
            className="upload-help-popover upload-help-popover--top-right"
            style={{
              top: `${helpPos.top}px`,
              left: `${helpPos.left}px`,
            }}
            role="tooltip"
            onMouseEnter={openHelp}
            onMouseLeave={closeHelp}
          >
            <div className="upload-help-title">Atenção</div>
            <div className="upload-help-lines">
              <div>Cuidado ao fazer conversão de xlsx para css</div>
              <div>Não é permitido colocar "-" no cpf do representante</div>
              <div>Não é permitido colocaram "-" no número da conta</div>
              <div>
                Não é permitido enter dentro de uma linha, isso quebra a
                conversão para csv, separe por "&".
              </div>
              <div>O csv é separado por ";".</div>
              <div>
                Todos os campos do csv devem ser obrigatoriamente preenchidos com dados válidos.
              </div>
              <div>Número de CPF e número da conta devem possuir apenas números.</div>
              <div>
                Cuidado, observe se a conversão não retirou o zero à esquerda do CPF ou da conta.
              </div>
            </div>
          </div>
        )}

        <div className="upload-card-body">
          <p>
            Envie um <code>entrada.csv</code>. O arquivo será enviado ao servidor
            principal (5502).
          </p>

          <form onSubmit={onSubmit}>
            <input
              ref={fileRef}
              className="upload-file-hidden"
              type="file"
              name="csv_file"
              accept=".csv,text/csv"
              required
              disabled={loading}
              onChange={onFileChange}
            />

            <div className={`upload-file-ui ${loading ? "is-disabled" : ""}`}>
              <button
                type="button"
                className="upload-file-btn"
                onClick={onPickFile}
                disabled={loading}
              >
                Escolher arquivo
              </button>

              <div className="upload-file-name" title={fileName}>
                {fileName}
              </div>
            </div>

            <button
              type="submit"
              className="upload-btn upload-btn-success"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar e Processar CSV"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}