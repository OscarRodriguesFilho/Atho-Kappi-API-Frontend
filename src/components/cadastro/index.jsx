import React, { useMemo, useState, useEffect } from "react";
import "./index.css";

// ✅ Se você usa proxy do Vite: deixe ""
// ✅ Se não usa proxy: "http://localhost:5502"
const API_BASE = "";
const CREATE_PATH = "/api/csv/create";

function onlyDigits(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

export default function Cadastro() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const [form, setForm] = useState({
    nome: "",
    numeroProcesso: "",
    valor: "",
    cnpjCpf: "",
    tipoPessoa: "",
    cep: "",
    endereco: "",
    numEndereco: "",
    bairro: "",
    cidade: "",
    uf: "",
    banco_1: "",
    agencia_1: "",
    contaCorrente_1: "",
    descricao_1: "",
    nomeContato_1: "",
    nomeRepresentante_1: "",
    cpfRepresentante_1: "",
    dataProcessamento: "",
    email_msg: "",
  });

  const createUrl = useMemo(() => `${API_BASE}${CREATE_PATH}`, []);

  function resetForm() {
    setForm({
      nome: "",
      numeroProcesso: "",
      valor: "",
      cnpjCpf: "",
      tipoPessoa: "",
      cep: "",
      endereco: "",
      numEndereco: "",
      bairro: "",
      cidade: "",
      uf: "",
      banco_1: "",
      agencia_1: "",
      contaCorrente_1: "",
      descricao_1: "",
      nomeContato_1: "",
      nomeRepresentante_1: "",
      cpfRepresentante_1: "",
      dataProcessamento: "",
      email_msg: "",
    });
    setStatusMsg("");
  }

  function openModal() {
    resetForm();
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setSubmitting(false);
    setStatusMsg("");
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeModal();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setStatusMsg("");
    setSubmitting(true);

    try {
      const cpfDigits = onlyDigits(form.cnpjCpf);
      if (!cpfDigits) throw new Error("Preencha o CPF/CNPJ (cnpjCpf).");

      const payload = {
        cpf: cpfDigits,
        nome: form.nome || "",
        numeroProcesso: form.numeroProcesso || "",
        valor: form.valor || "",
        email_msg: form.email_msg || "",
        avancado: {
          tipoPessoa: form.tipoPessoa || "",
          cnpjCpf: form.cnpjCpf || "",
          endereco: form.endereco || "",
          numEndereco: form.numEndereco || "",
          cep: form.cep || "",
          bairro: form.bairro || "",
          cidade: form.cidade || "",
          uf: form.uf || "",
          banco_1: form.banco_1 || "",
          agencia_1: form.agencia_1 || "",
          contaCorrente_1: form.contaCorrente_1 || "",
          descricao_1: form.descricao_1 || "",
          nomeContato_1: form.nomeContato_1 || "",
          nomeRepresentante_1: form.nomeRepresentante_1 || "",
          cpfRepresentante_1: form.cpfRepresentante_1 || "",
          dataProcessamento: form.dataProcessamento || "",
        },
      };

      const resp = await fetch(createUrl, {
        method: "POST",
        credentials: "include", // ✅ ESSENCIAL: manda o cookie JWT
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!resp.ok) {
        // ✅ melhora a mensagem quando o JWT não veio
        if (resp.status === 401) {
          throw new Error("Não autorizado (401). Você está logado? (cookie JWT não chegou)");
        }
        const msg = data?.error || data?.message || text || "Erro ao cadastrar.";
        throw new Error(msg);
      }

      const docId = data?.doc_id || "-";
      setStatusMsg(`✅ Cadastrado! ID: ${docId}`);

      setTimeout(() => {
        closeModal();
      }, 650);
    } catch (err) {
      setStatusMsg(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* ✅ FAB */}
      <button
        type="button"
        className="fab-plus"
        id="btnOpenCreate"
        title="Novo cadastro"
        aria-label="Novo cadastro"
        onClick={openModal}
      >
        <span className="fab-plus__icon">+</span>
      </button>

      {/* ✅ Modal */}
      {open && (
        <>
          <div className="modal-backdrop fade show cad-backdrop-anim" />

          <div
            className="modal fade show"
            style={{ display: "block" }}
            tabIndex={-1}
            aria-hidden="false"
            role="dialog"
            onMouseDown={closeModal}
          >
            <div
              className="modal-dialog modal-dialog-centered modal-lg cad-modal cad-modal-anim"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Novo cadastro (CSV)</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Fechar"
                    onClick={closeModal}
                  />
                </div>

                <div className="modal-body">
                  {/* ✅ DISPOSIÇÃO IGUAL À IMAGEM */}
                  <div className="row g-3">
                    {/* Nome | Número do Processo */}
                    <div className="col-md-6">
                      <label className="form-label">Nome</label>
                      <input
                        name="nome"
                        value={form.nome}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Nome"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Número do Processo</label>
                      <input
                        name="numeroProcesso"
                        value={form.numeroProcesso}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="0000000-00.0000.0.00.0000"
                      />
                    </div>

                    {/* Valor | cnpjCpf */}
                    <div className="col-md-6">
                      <label className="form-label">Valor</label>
                      <input
                        name="valor"
                        value={form.valor}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="R$ 10.000,00"
                      />
                      <div className="small text-muted mt-1">
                        Pode ser com ou sem “R$”. Aceita vírgula e ponto.
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">cnpjCpf</label>
                      <input
                        name="cnpjCpf"
                        value={form.cnpjCpf}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="CPF/CNPJ"
                      />
                    </div>

                    {/* tipoPessoa | cep */}
                    <div className="col-md-6">
                      <label className="form-label">tipoPessoa</label>
                      <input
                        name="tipoPessoa"
                        value={form.tipoPessoa}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="F/J"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">cep</label>
                      <input
                        name="cep"
                        value={form.cep}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="00000-000"
                      />
                    </div>

                    {/* endereco (8) | numEndereco (4) */}
                    <div className="col-md-8">
                      <label className="form-label">endereco</label>
                      <input
                        name="endereco"
                        value={form.endereco}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Rua..."
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">numEndereco</label>
                      <input
                        name="numEndereco"
                        value={form.numEndereco}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="123"
                      />
                    </div>

                    {/* bairro (6) | cidade (4) | uf (2) */}
                    <div className="col-md-6">
                      <label className="form-label">bairro</label>
                      <input
                        name="bairro"
                        value={form.bairro}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Bairro"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">cidade</label>
                      <input
                        name="cidade"
                        value={form.cidade}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Cidade"
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label">uf</label>
                      <input
                        name="uf"
                        value={form.uf}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="SP"
                      />
                    </div>

                    {/* banco_1 | agencia_1 | contaCorrente_1 */}
                    <div className="col-md-4">
                      <label className="form-label">banco_1</label>
                      <input
                        name="banco_1"
                        value={form.banco_1}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="001"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">agencia_1</label>
                      <input
                        name="agencia_1"
                        value={form.agencia_1}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="1234"
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">contaCorrente_1</label>
                      <input
                        name="contaCorrente_1"
                        value={form.contaCorrente_1}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="00000-0"
                      />
                    </div>

                    {/* descricao_1 full */}
                    <div className="col-12">
                      <label className="form-label">descricao_1</label>
                      <input
                        name="descricao_1"
                        value={form.descricao_1}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Descrição"
                      />
                    </div>

                    {/* nomeContato_1 | nomeRepresentante_1 */}
                    <div className="col-md-6">
                      <label className="form-label">nomeContato_1</label>
                      <input
                        name="nomeContato_1"
                        value={form.nomeContato_1}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Contato"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">nomeRepresentante_1</label>
                      <input
                        name="nomeRepresentante_1"
                        value={form.nomeRepresentante_1}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        placeholder="Representante"
                      />
                    </div>

                    {/* cpfRepresentante_1 | dataProcessamento */}
                    <div className="col-md-6">
                      <label className="form-label">cpfRepresentante_1</label>
                      <input
                        name="cpfRepresentante_1"
                        value={form.cpfRepresentante_1}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="CPF representante"
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">dataProcessamento</label>
                      <input
                        name="dataProcessamento"
                        value={form.dataProcessamento}
                        onChange={onChange}
                        className="form-control form-control-sm mono"
                        placeholder="(vazio = agora)"
                      />
                    </div>

                    {/* email_msg full */}
                    <div className="col-12">
                      <label className="form-label">email_msg</label>
                      <textarea
                        name="email_msg"
                        value={form.email_msg}
                        onChange={onChange}
                        className="form-control form-control-sm"
                        rows={3}
                        placeholder="Mensagem de e-mail (opcional)"
                      />
                    </div>

                    <div className="col-12">
                      <div className="small text-muted">
                        Observação: flags (kappi/analise/sinqia/email) do CSV começam
                        como <b>false</b> no cadastro novo.
                      </div>
                    </div>
                  </div>

                  {statusMsg ? (
                    <div
                      className={`cad-inline-status mt-3 ${
                        statusMsg.startsWith("✅") ? "ok" : "err"
                      }`}
                    >
                      {submitting && <span className="cad-loading-dot" />}
                      {statusMsg}
                    </div>
                  ) : null}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    id="btnConfirmCreate"
                    onClick={submit}
                    disabled={submitting}
                  >
                    {submitting ? "Cadastrando..." : "Cadastrar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}