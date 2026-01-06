import React from "react";

export default function ConsultaTemplate({
  title,
  subtitle,
  doc,
  setDoc,
  loading,
  onSubmit,
  error,
  navbar,
  children,
}) {
  return (
    <section className="ck-wrap">
      <div className="ck-header">
        <div className="ck-title">{title}</div>
        <div className="ck-sub">{subtitle}</div>

        <div className="ck-form">
          <div className="ck-field">
            <label>CPF/CNPJ (cnpjCpf)</label>
            <input
              value={doc}
              onChange={(e) => setDoc(e.target.value)}
              placeholder="ex: 06006506000194"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSubmit?.();
                }
              }}
            />
          </div>

          <button className="ck-btn" onClick={onSubmit} disabled={loading} type="button">
            {loading ? "Consultando..." : "Consultar"}
          </button>
        </div>

        {error ? <div className="ck-error">{error}</div> : null}
      </div>

      {navbar}

      {children}
    </section>
  );
}
