import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

/* =========================
   Config
========================= */
const API_BASE = "http://localhost:5502"; // ✅ tua API do frontend
const KAPPI_REAL_BASE = "http://localhost:5502"; // ✅ Kappi REAL (porta 5502)

/* =========================
   Utils (iguais ao Flask)
========================= */
function normText(s) {
  return (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function digitsOnly(s) {
  return (s || "").toString().replace(/\D+/g, "");
}

function parseBoolish(v) {
  if (v === true) return true;
  if (v === false) return false;
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "true" || s === "1" || s === "sim" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "nao" || s === "não" || s === "no") return false;
  return null;
}

function regraToSelect(v) {
  const b = parseBoolish(v);
  if (b === true) return "true";
  if (b === false) return "false";
  return "";
}

function isErroString(v) {
  if (v == null) return false;
  if (typeof v !== "string") return false;
  return v.trim().toLowerCase() === "erro";
}

/* =========================
   ✅ Date parsing helpers
   dataProcessamento: "22/12/2025 10:28"
========================= */
function parseBRDateTimeToMs(s) {
  // aceita: "DD/MM/YYYY", "DD/MM/YYYY HH:MM", "DD/MM/YYYY HH:MM:SS"
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (!m) return null;

  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  const HH = m[4] != null ? parseInt(m[4], 10) : 0;
  const MI = m[5] != null ? parseInt(m[5], 10) : 0;
  const SS = m[6] != null ? parseInt(m[6], 10) : 0;

  // Date(yyyy, mm-1, dd, HH, MI, SS) => timezone local (ok p/ filtro)
  const dt = new Date(yyyy, mm - 1, dd, HH, MI, SS);
  const ms = dt.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseISODateInputToRangeMs(isoDate, mode /* "start" | "end" */) {
  // isoDate: "YYYY-MM-DD" vindo do <input type="date">
  if (!isoDate) return null;
  const m = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const yyyy = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const dd = parseInt(m[3], 10);

  if (mode === "end") {
    // fim do dia: 23:59:59.999
    return new Date(yyyy, mm - 1, dd, 23, 59, 59, 999).getTime();
  }
  // início do dia
  return new Date(yyyy, mm - 1, dd, 0, 0, 0, 0).getTime();
}

async function getJson(url) {
  const resp = await fetch(url, { method: "GET" });
  const text = await resp.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // ✅ se não vier JSON (ex: XML download / texto OK), ainda funciona
    data = { raw: text };
  }
  if (!resp.ok)
    throw new Error(
      data && (data.error || data.message) ? (data.error || data.message) : text
    );
  return data;
}

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  const text = await resp.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!resp.ok)
    throw new Error(
      data && (data.error || data.message) ? (data.error || data.message) : text
    );
  return data;
}

/* =========================
   “HTML do Flask” em React:
   - Cards/Container/Classes
   - CSS replicando o teu <style>
========================= */
export default function Tabela({ refreshKey = 0 }) {
  const [limit, setLimit] = useState(200);

  const [items, setItems] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [tableErr, setTableErr] = useState("");

  // live search igual ao Flask
  const [search, setSearch] = useState("");

  // ✅ filtro de status (dropdown)
  const [statusFilter, setStatusFilter] = useState("");

  // ✅ NOVO: filtro por data (intervalo) usando dataProcessamento
  // usa input type="date" => "YYYY-MM-DD"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // ✅ agora também guarda cnpjCpf
  const [CURRENT, setCURRENT] = useState({
    docid: null,
    cpf: null,
    processo: null,
    cnpjCpf: null,
  });

  // fields
  const [dNome, setDNome] = useState("");
  const [dProc, setDProc] = useState("");
  const [dEmailMsg, setDEmailMsg] = useState("");

  const [dKappi, setDKappi] = useState(false);
  const [dAnalise, setDAnalise] = useState(false);

  // ✅ agora sinqia tem raw (pode ser boolean OU "Erro")
  const [dSinqia, setDSinqia] = useState(false);
  const [dSinqiaRaw, setDSinqiaRaw] = useState(null);

  const [dEmail, setDEmail] = useState(false);

  const [r0, setR0] = useState("");
  const [r1, setR1] = useState("");
  const [r2, setR2] = useState("");
  const [r3, setR3] = useState("");
  const [r4, setR4] = useState("");
  const [r5, setR5] = useState("");

  const [advOpen, setAdvOpen] = useState(false);
  const [a_tipoPessoa, setA_tipoPessoa] = useState("");
  const [a_cnpjCpf, setA_cnpjCpf] = useState("");
  const [a_endereco, setA_endereco] = useState("");
  const [a_numEndereco, setA_numEndereco] = useState("");
  const [a_cep, setA_cep] = useState("");
  const [a_bairro, setA_bairro] = useState("");
  const [a_cidade, setA_cidade] = useState("");
  const [a_uf, setA_uf] = useState("");
  const [a_banco_1, setA_banco_1] = useState("");
  const [a_agencia_1, setA_agencia_1] = useState("");
  const [a_contaCorrente_1, setA_contaCorrente_1] = useState("");
  const [a_descricao_1, setA_descricao_1] = useState("");
  const [a_nomeContato_1, setA_nomeContato_1] = useState("");
  const [a_nomeRepresentante_1, setA_nomeRepresentante_1] = useState("");
  const [a_cpfRepresentante_1, setA_cpfRepresentante_1] = useState("");
  const [a_valorProcesso, setA_valorProcesso] = useState("");
  const [a_dataProcessamento, setA_dataProcessamento] = useState("");

  const [saveStatus, setSaveStatus] = useState("");

  // modais
  const [appModalOpen, setAppModalOpen] = useState(false);
  const [appModalTitle, setAppModalTitle] = useState("Aviso");
  const [appModalBody, setAppModalBody] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState(null);

  function showAppModal(title, htmlBody) {
    setAppModalTitle(title || "Aviso");
    setAppModalBody(htmlBody || "");
    setAppModalOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setAppModalOpen(false);
        setDeleteModalOpen(false);
        closeDrawer();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function clearDrawerFields() {
    setDNome("");
    setDProc("");
    setDEmailMsg("");

    setDKappi(false);
    setDAnalise(false);

    setDSinqia(false);
    setDSinqiaRaw(null);

    setDEmail(false);

    setR0("");
    setR1("");
    setR2("");
    setR3("");
    setR4("");
    setR5("");

    setA_tipoPessoa("");
    setA_cnpjCpf("");
    setA_endereco("");
    setA_numEndereco("");
    setA_cep("");
    setA_bairro("");
    setA_cidade("");
    setA_uf("");
    setA_banco_1("");
    setA_agencia_1("");
    setA_contaCorrente_1("");
    setA_descricao_1("");
    setA_nomeContato_1("");
    setA_nomeRepresentante_1("");
    setA_cpfRepresentante_1("");
    setA_valorProcesso("");
    setA_dataProcessamento("");

    setAdvOpen(false);
    setSaveStatus("");
  }

  async function loadTable() {
    setLoadingTable(true);
    setTableErr("");
    try {
      const data = await getJson(
        `${API_BASE}/api/analise_csv?limit=${encodeURIComponent(limit)}`
      );
      const list = Array.isArray(data.items) ? data.items : [];

      const normalized = list.map((it) => {
        const cpf = digitsOnly(it.cpf || "");
        const processo = (it.numeroProcesso || "").toString().trim();
        const nome = (it.nome || "").toString().trim();
        const search_key = `${cpf} ${processo} ${nome}`.trim();

        // ✅ NOVO: parse dataProcessamento para ms (para filtro)
        const dpRaw =
          it.dataProcessamento ??
          it.data_processamento ??
          it.dataProc ??
          it.data ??
          "";
        const dp_ms = parseBRDateTimeToMs(dpRaw);

        return {
          ...it,
          cpf_digits: cpf || "-",
          processo_show: processo || "-",
          nome_show: nome || "",
          search_key,
          dataProcessamento_show: (dpRaw || "").toString(),
          dataProcessamento_ms: dp_ms, // pode ser null se não parsear
        };
      });

      setItems(normalized);
    } catch (e) {
      setTableErr(e.message || "Erro ao carregar tabela.");
    } finally {
      setLoadingTable(false);
    }
  }

  useEffect(() => {
    loadTable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, refreshKey]);

  function normalizeStatusValue(v) {
    const s = normText(v);
    if (!s) return "";
    if (s === "atencao" || s === "atençao" || s === "atenção") return "atencao";
    if (s === "aprovado") return "aprovado";
    if (s === "reprovado") return "reprovado";
    return s;
  }

  const filteredItems = useMemo(() => {
    const q = normText(search);
    const qd = digitsOnly(q);
    const statusWanted = normalizeStatusValue(statusFilter);

    // ✅ NOVO: range por data (inclusive)
    const fromMs = parseISODateInputToRangeMs(dateFrom, "start"); // null se vazio
    const toMs = parseISODateInputToRangeMs(dateTo, "end"); // null se vazio

    return items.filter((it) => {
      let okText = true;
      if (q) {
        const keyNorm = normText(it.search_key);
        const keyDigits = digitsOnly(it.search_key);
        okText = keyNorm.includes(q) || (qd && keyDigits.includes(qd));
      }

      let okStatus = true;
      if (statusWanted) {
        const itStatus = normalizeStatusValue(it.status || "");
        okStatus = itStatus === statusWanted;
      }

      // ✅ NOVO: filtro por dataProcessamento
      let okDate = true;
      if (fromMs != null || toMs != null) {
        const ms = it.dataProcessamento_ms ?? null;

        // se usuário ativou filtro por data, mas o item não tem data parseável:
        // -> eu recomendo EXCLUIR para o filtro ser "confiável".
        okDate = ms != null;

        if (okDate && fromMs != null) okDate = ms >= fromMs;
        if (okDate && toMs != null) okDate = ms <= toMs;
      }

      return okText && okStatus && okDate;
    });
  }, [items, search, statusFilter, dateFrom, dateTo]);

  function boolPillHtml(v) {
    const b = parseBoolish(v);
    if (b === true) return <span className="bool-pill bool-true">True</span>;
    if (b === false) return <span className="bool-pill bool-false">False</span>;
    return <span className="bool-pill bool-null">-</span>;
  }

  function sinqiaPillHtml(v) {
    if (isErroString(v)) return <span className="bool-pill bool-erro">Erro</span>;
    return boolPillHtml(v);
  }

  function rulePillHtml(v) {
    const s = regraToSelect(v);
    if (s === "true") return <span className="rule-pill rule-true">True</span>;
    if (s === "false") return <span className="rule-pill rule-false">False</span>;
    return <span className="rule-pill rule-vazio">-</span>;
  }

  function statusPillHtml(status) {
    const s = (status || "").toString().trim().toLowerCase();
    if (s === "aprovado") return <span className="status-pill status-aprovado">Aprovado</span>;
    if (s === "reprovado") return <span className="status-pill status-reprovado">Reprovado</span>;
    if (s === "atenção" || s === "atencao")
      return <span className="status-pill status-atencao">Atenção</span>;
    return <span className="status-pill status-vazio">{status || "-"}</span>;
  }

  async function loadFullDoc(docid) {
    setDrawerLoading(true);
    try {
      const data = await getJson(`${API_BASE}/api/csv/get?doc_id=${encodeURIComponent(docid)}`);
      const d = data.doc || {};
      const analise = data.analise || {};

      setDNome(d.nome || "");
      setDProc(d.numeroProcesso || "");
      setDEmailMsg(d.email_msg || "");

      setDKappi(parseBoolish(d.kappi) === true);
      setDAnalise(parseBoolish(d.analise) === true);

      setDSinqiaRaw(d.cadastroSinqia ?? null);
      setDSinqia(parseBoolish(d.cadastroSinqia) === true);

      setDEmail(parseBoolish(d.envioEmail) === true);

      setR0(regraToSelect(analise.regra_0));
      setR1(regraToSelect(analise.regra_1));
      setR2(regraToSelect(analise.regra_2));
      setR3(regraToSelect(analise.regra_3));
      setR4(regraToSelect(analise.regra_4));
      setR5(regraToSelect(analise.regra_5));

      setA_tipoPessoa(d.tipoPessoa || "");
      setA_cnpjCpf(d.cnpjCpf || "");
      setA_endereco(d.endereco || "");
      setA_numEndereco(d.numEndereco || "");
      setA_cep(d.cep || "");
      setA_bairro(d.bairro || "");
      setA_cidade(d.cidade || "");
      setA_uf(d.uf || "");
      setA_banco_1(d.banco_1 || "");
      setA_agencia_1(d.agencia_1 || "");
      setA_contaCorrente_1(d.contaCorrente_1 || "");
      setA_descricao_1(d.descricao_1 || "");
      setA_nomeContato_1(d.nomeContato_1 || "");
      setA_nomeRepresentante_1(d.nomeRepresentante_1 || "");
      setA_cpfRepresentante_1(d.cpfRepresentante_1 || "");
      setA_valorProcesso(d.valorProcesso || "");
      setA_dataProcessamento(d.dataProcessamento || "");

      setCURRENT((prev) => ({
        ...prev,
        cnpjCpf: d.cnpjCpf ?? prev.cnpjCpf ?? null,
      }));

      if (d.numeroProcesso) {
        setCURRENT((prev) => ({ ...prev, processo: d.numeroProcesso }));
      }
    } finally {
      setDrawerLoading(false);
    }
  }

  async function openRow(it) {
    const docid = it.doc_id;
    const cpf = digitsOnly(it.cpf || it.cpf_digits || "");
    const processo = (it.numeroProcesso || "").toString().trim();

    const cnpjCpfFromRow =
      it.cnpjCpf ?? it.cnpj_cpf ?? it.cnpjcpf ?? it.documento ?? it.doc ?? null;

    setCURRENT({ docid, cpf, processo, cnpjCpf: cnpjCpfFromRow });

    clearDrawerFields();
    setDrawerOpen(true);

    try {
      await loadFullDoc(docid);
    } catch (err) {
      showAppModal("Erro ao carregar", "❌ " + (err.message || String(err)));
    }
  }

  async function saveMongo() {
    if (!CURRENT.docid) return showAppModal("Atenção", "Selecione uma linha antes.");

    setSaveStatus('<span class="loading-dot"></span> salvando...');
    try {
      const cadastroSinqiaToSave =
        isErroString(dSinqiaRaw) && dSinqia === false ? "Erro" : dSinqia;

      const payload = {
        doc_id: CURRENT.docid,
        cpf: CURRENT.cpf,

        nome: dNome,
        numeroProcesso: dProc,
        email_msg: dEmailMsg,

        kappi: dKappi,
        analise: dAnalise,
        cadastroSinqia: cadastroSinqiaToSave,
        envioEmail: dEmail,

        regras: {
          regra_0: r0 === "" ? null : r0 === "true",
          regra_1: r1 === "" ? null : r1 === "true",
          regra_2: r2 === "" ? null : r2 === "true",
          regra_3: r3 === "" ? null : r3 === "true",
          regra_4: r4 === "" ? null : r4 === "true",
          regra_5: r5 === "" ? null : r5 === "true",
        },

        avancado: {
          tipoPessoa: a_tipoPessoa,
          cnpjCpf: a_cnpjCpf,
          endereco: a_endereco,
          numEndereco: a_numEndereco,
          cep: a_cep,
          bairro: a_bairro,
          cidade: a_cidade,
          uf: a_uf,
          banco_1: a_banco_1,
          agencia_1: a_agencia_1,
          contaCorrente_1: a_contaCorrente_1,
          descricao_1: a_descricao_1,
          nomeContato_1: a_nomeContato_1,
          nomeRepresentante_1: a_nomeRepresentante_1,
          cpfRepresentante_1: a_cpfRepresentante_1,
          valorProcesso: a_valorProcesso,
          dataProcessamento: a_dataProcessamento,
        },
      };

      await postJson(`${API_BASE}/api/csv/update`, payload);

      setSaveStatus("✅ Salvo no Mongo! Recarregando...");
      await loadTable();
      setTimeout(() => setSaveStatus(""), 700);
    } catch (err) {
      showAppModal("Erro ao salvar", "❌ " + (err.message || String(err)));
      setSaveStatus("❌ Erro ao salvar.");
    }
  }

  // ✅ AÇÃO REAL: Bulk consult REAL + upsert na collection "kappi" (porta 5502)
  async function actionKappiRealBulk() {
    const raw = CURRENT.cnpjCpf || a_cnpjCpf || "";
    const doc = digitsOnly(raw);

    if (!doc) {
      showAppModal(
        "Atenção",
        "Esse registro não tem <b>cnpjCpf</b> preenchido. Sem isso não dá para chamar a Kappi real."
      );
      return;
    }

    setSaveStatus('<span class="loading-dot"></span> chamando Kappi REAL (bulk consult)...');

    try {
      const url = `${KAPPI_REAL_BASE}/api/kappi_real/bulk_consult_save`;

      const payload = {
        consult_type: "REPUTATIONAL",
        documents: [doc],
      };

      console.log("KAPPI REAL BULK URL:", url);
      console.log("KAPPI REAL BULK PAYLOAD:", payload);

      await postJson(url, payload);

      setSaveStatus("✅ Kappi REAL acionado. Recarregando...");
      await loadTable();
      setTimeout(() => setSaveStatus(""), 700);
    } catch (err) {
      showAppModal("Erro Kappi REAL", "❌ " + (err.message || String(err)));
      setSaveStatus("❌ Erro Kappi REAL");
    }
  }

  // ✅ helper genérico de POST actions
  function bindAction(url, labelOk, labelErr) {
    return async () => {
      if (!CURRENT.cpf) {
        showAppModal("Atenção", "Selecione uma linha antes.");
        return;
      }
      setSaveStatus('<span class="loading-dot"></span> chamando API...');
      try {
        await postJson(`${API_BASE}${url}`, { cpf: CURRENT.cpf });
        setSaveStatus("✅ " + labelOk + " Recarregando...");
        await loadTable();
        setTimeout(() => setSaveStatus(""), 700);
      } catch (err) {
        showAppModal(labelErr, "❌ " + (err.message || String(err)));
        setSaveStatus("❌ " + labelErr);
      }
    };
  }

  // ============================================================
  // ✅ NOVO: SINQIA = primeiro gera XML do CPF, depois cadastra
  // 1) GET /gerar_xml/<cpf>
  // 2) GET /cadastrar_sinq
  // ============================================================
  async function actionSinqiaWithXmlFirst() {
    if (!CURRENT.cpf) {
      showAppModal("Atenção", "Selecione uma linha antes.");
      return;
    }

    const cpf = digitsOnly(CURRENT.cpf);
    if (!cpf) {
      showAppModal("Atenção", "CPF inválido.");
      return;
    }

    setSaveStatus('<span class="loading-dot"></span> gerando XML e cadastrando na Sinqia...');

    try {
      // 1) gera XML
      const urlXml = `${API_BASE}/gerar_xml/${encodeURIComponent(cpf)}`;
      console.log("GERAR XML URL:", urlXml);
      await getJson(urlXml); // ✅ mesmo se não vier JSON, passa (vira {raw: ...})

      // 2) cadastra na sinqia (usa o último XML gerado)
      const urlSinq = `${API_BASE}/cadastrar_sinq`;
      console.log("CADASTRAR SINQ URL:", urlSinq);
      await getJson(urlSinq);

      setSaveStatus("✅ XML gerado e cadastro Sinqia acionado. Recarregando...");
      await loadTable();
      setTimeout(() => setSaveStatus(""), 700);
    } catch (err) {
      showAppModal("Erro Sinqia", "❌ " + (err.message || String(err)));
      setSaveStatus("❌ Erro Sinqia");
    }
  }

  // ✅ Kappi agora chama o REAL (5502)
  const actionKappi = actionKappiRealBulk;

  // ✅ demais continuam no padrão
  const actionAnalise = bindAction("/api/action/analise", "Análise acionada.", "Erro Análise");

  // ✅ SINQIA: agora encadeia gerar_xml -> cadastrar_sinq
  const actionSinqia = actionSinqiaWithXmlFirst;

  const actionEmail = bindAction("/api/action/email", "E-mail acionado.", "Erro E-mail");

  function excelAnalise() {
    if (!CURRENT.cpf) return showAppModal("Atenção", "Selecione uma linha com CPF antes.");
    window.open(`${API_BASE}/api/action/excel_analise?cpf=${encodeURIComponent(CURRENT.cpf)}`, "_blank");
  }

  function excelCadastro() {
    if (!CURRENT.cpf) return showAppModal("Atenção", "Selecione uma linha antes.");
    window.open(`${API_BASE}/api/action/excel_cadastro?cpf=${encodeURIComponent(CURRENT.cpf)}`, "_blank");
  }

  function askDelete(docid) {
    setPendingDeleteDocId(docid);
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    const docid = pendingDeleteDocId;
    if (!docid) return;

    try {
      await postJson(`${API_BASE}/api/csv/delete`, { doc_id: docid });
      setDeleteModalOpen(false);
      setPendingDeleteDocId(null);
      showAppModal("Excluído", "✅ Registro excluído com sucesso.");
      await loadTable();
    } catch (err) {
      setDeleteModalOpen(false);
      setPendingDeleteDocId(null);
      showAppModal("Erro ao excluir", "❌ " + (err.message || String(err)));
    }
  }

  return (
    <>
      <div className="bg-light">
        <div className="container py-4">
          <div className="card">
            <div className="card-header fw-bold">
              Registros CSV + Regras de Análise
              <span className="text-muted small ms-2">(até {limit} entradas)</span>

              <span className="ms-3 small text-muted">• Limite:</span>
              <input
                className="form-control form-control-sm d-inline-block ms-2"
                style={{ width: 110 }}
                type="number"
                min={1}
                max={2000}
                value={limit}
                onChange={(e) =>
                  setLimit(Math.max(1, Math.min(2000, parseInt(e.target.value || "200", 10))))
                }
              />
            </div>

            <div className="card-body">
              <p className="text-muted mb-2">
                Base: coleção <code>csv</code>. Para cada CPF, busca a coleção <code>analise</code>.
                Clique em uma linha para abrir o painel lateral e editar/rodar ações.
              </p>

              <div className="search-bar">
                <input
                  id="liveSearch"
                  className="form-control"
                  type="text"
                  placeholder="Pesquisar por CPF, número do processo ou nome..."
                  autoComplete="off"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="form-select"
                  style={{ maxWidth: 190 }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  title="Filtrar por Status"
                  aria-label="Filtrar por Status"
                >
                  <option value="">Status: Todos</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="atencao">Atenção</option>
                </select>

                {/* ✅ NOVO: filtro por data (intervalo) */}
                <input
                  className="form-control"
                  style={{ maxWidth: 170 }}
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  title="Data (de)"
                  aria-label="Data (de)"
                />
                <input
                  className="form-control"
                  style={{ maxWidth: 170 }}
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  title="Data (até)"
                  aria-label="Data (até)"
                />

                <button
                  className="btn btn-light"
                  type="button"
                  id="btnClearSearch"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  Limpar
                </button>
              </div>

              <div className="search-hint mb-3">
                Digite e a tabela filtra na hora. Aceita <b>CPF</b>, <b>Número do Processo</b> ou <b>Nome</b>.
                <span className="ms-2">•</span> Use o dropdown para filtrar por <b>Status</b>.
                <span className="ms-2">•</span> Use o intervalo para filtrar por <b>dataProcessamento</b>.
              </div>

              <div className="table-responsive" style={{ maxHeight: 520, overflowY: "auto" }}>
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>CPF</th>
                      <th>Processo</th>
                      <th>Valor</th>

                      <th>Kappi</th>
                      <th>Análise</th>
                      <th>Sinqia</th>
                      <th>E-mail</th>

                      <th>Regra 0</th>
                      <th>Regra 1</th>
                      <th>Regra 2</th>
                      <th>Regra 3</th>
                      <th>Regra 4</th>
                      <th>Regra 5</th>

                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody id="tbodyMain">
                    {loadingTable ? (
                      <tr>
                        <td colSpan={16} className="text-muted">
                          <span className="loading-dot"></span> carregando tabela...
                        </td>
                      </tr>
                    ) : tableErr ? (
                      <tr>
                        <td colSpan={16} className="text-danger">
                          ❌ {tableErr}
                        </td>
                      </tr>
                    ) : filteredItems.length ? (
                      filteredItems.map((it, idx) => {
                        const regras = it.regras || {};
                        const status = it.status || "-";
                        const valorShow = (it.valor_fmt ?? it.valor ?? "-").toString();

                        return (
                          <tr
                            key={it.doc_id || idx}
                            className="clickable-row"
                            data-docid={it.doc_id}
                            data-cpf={it.cpf_digits}
                            data-processo={it.processo_show}
                            data-nome={it.nome_show}
                            data-search={it.search_key}
                            onClick={() => openRow(it)}
                          >
                            <td>{idx + 1}</td>
                            <td className="mono">{it.cpf_digits || "-"}</td>
                            <td className="mono">{it.processo_show || "-"}</td>
                            <td className="mono">{valorShow}</td>

                            <td>{boolPillHtml(it.kappi)}</td>
                            <td>{boolPillHtml(it.analise)}</td>

                            <td>{sinqiaPillHtml(it.cadastroSinqia)}</td>

                            <td>{boolPillHtml(it.envioEmail)}</td>

                            <td>{rulePillHtml(regras.regra_0)}</td>
                            <td>{rulePillHtml(regras.regra_1)}</td>
                            <td>{rulePillHtml(regras.regra_2)}</td>
                            <td>{rulePillHtml(regras.regra_3)}</td>
                            <td>{rulePillHtml(regras.regra_4)}</td>
                            <td>{rulePillHtml(regras.regra_5)}</td>

                            <td>{statusPillHtml(status)}</td>

                            <td onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className="trash-icon-btn btn-delete-row"
                                data-docid={it.doc_id}
                                title="Excluir registro"
                                aria-label="Excluir"
                                onClick={() => askDelete(it.doc_id)}
                              >
                                🗑
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={16} className="text-center text-muted">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="small text-muted mt-2 mb-0">
                Endpoint JSON equivalente:{" "}
                <code>/api/analise_csv?limit={limit}</code>
              </p>
            </div>
          </div>
        </div>

        {/* Drawer */}
        <div
          id="drawerBackdrop"
          className="drawer-backdrop"
          style={{ display: drawerOpen ? "block" : "none" }}
          onClick={closeDrawer}
        />
        <div id="drawer" className={`drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
          <div className="drawer-header">
            <div>
              <p className="drawer-title mb-0">Editar / Re-rodar etapas</p>
              <div className="small-muted">
                CPF: <span id="d_cpf" className="mono">{CURRENT.cpf || ""}</span>
                <span className="ms-2">•</span>
                <span className="ms-2 small-muted">
                  ID: <span id="d_docid_show" className="mono">{CURRENT.docid || ""}</span>
                </span>
              </div>
            </div>
            <button className="btn btn-light btn-sm" id="drawerCloseBtn" onClick={closeDrawer}>
              Fechar
            </button>
          </div>

          <div className="drawer-body">
            <input type="hidden" id="d_docid" value={CURRENT.docid || ""} readOnly />

            <div
              id="drawerLoading"
              className="small-muted mb-2"
              style={{ display: drawerLoading ? "block" : "none" }}
            >
              <span className="loading-dot"></span> carregando dados completos...
            </div>

            <div className="mb-2">
              <label className="form-label">Nome</label>
              <input
                id="d_nome"
                className="form-control form-control-sm"
                placeholder="nome"
                value={dNome}
                onChange={(e) => setDNome(e.target.value)}
              />
            </div>

            <div className="mb-2">
              <label className="form-label">Número do Processo</label>
              <input
                id="d_processo"
                className="form-control form-control-sm mono"
                placeholder="numeroProcesso"
                value={dProc}
                onChange={(e) => setDProc(e.target.value)}
              />
            </div>

            <div className="mb-2">
              <label className="form-label">email_msg</label>
              <textarea
                id="d_email_msg"
                className="form-control form-control-sm"
                rows={3}
                placeholder="email_msg"
                value={dEmailMsg}
                onChange={(e) => setDEmailMsg(e.target.value)}
              />
            </div>

            <div className="grid-2 mb-2">
              <div>
                <label className="form-label fw-bold mb-1">Flags do CSV</label>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="d_kappi"
                    checked={dKappi}
                    onChange={(e) => setDKappi(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="d_kappi">kappi</label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="d_analise"
                    checked={dAnalise}
                    onChange={(e) => setDAnalise(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="d_analise">analise</label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="d_sinqia"
                    checked={dSinqia}
                    onChange={(e) => setDSinqia(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="d_sinqia">
                    cadastroSinqia
                    {isErroString(dSinqiaRaw) && (
                      <span className="ms-2 bool-pill bool-erro" style={{ verticalAlign: "middle" }}>
                        Erro
                      </span>
                    )}
                  </label>
                </div>

                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="d_email"
                    checked={dEmail}
                    onChange={(e) => setDEmail(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="d_email">envioEmail</label>
                </div>

                <div className="small-muted mt-1">
                  Salvar aqui atualiza a coleção <b>csv</b>.
                </div>
              </div>

              <div>
                <label className="form-label fw-bold mb-1">Regras (True/False)</label>

                {[
                  ["r0", r0, setR0, 0],
                  ["r1", r1, setR1, 1],
                  ["r2", r2, setR2, 2],
                  ["r3", r3, setR3, 3],
                  ["r4", r4, setR4, 4],
                  ["r5", r5, setR5, 5],
                ].map(([id, val, setter, i]) => (
                  <div className="mb-1" key={id}>
                    <label className="small-muted">Regra {i}</label>
                    <select
                      id={id}
                      className="form-select form-select-sm"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                    >
                      <option value="">-</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                ))}

                <div className="small-muted mt-1">
                  Salvar aqui também atualiza a coleção <b>analise</b> (por CPF).
                </div>
              </div>
            </div>

            <hr />

            <button
              className="btn btn-outline-secondary w-100"
              id="btnToggleAvancado"
              onClick={() => setAdvOpen((s) => !s)}
            >
              Edição avançada
            </button>

            <div id="boxAvancado" className="adv-box mt-2" style={{ display: advOpen ? "block" : "none" }}>
              <div className="row g-2">
                <div className="col-6">
                  <label className="form-label small-muted">tipoPessoa</label>
                  <input
                    id="a_tipoPessoa"
                    className="form-control form-control-sm"
                    value={a_tipoPessoa}
                    onChange={(e) => setA_tipoPessoa(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small-muted">cnpjCpf</label>
                  <input
                    id="a_cnpjCpf"
                    className="form-control form-control-sm mono"
                    value={a_cnpjCpf}
                    onChange={(e) => setA_cnpjCpf(e.target.value)}
                  />
                </div>

                <div className="col-8">
                  <label className="form-label small-muted">endereco</label>
                  <input
                    id="a_endereco"
                    className="form-control form-control-sm"
                    value={a_endereco}
                    onChange={(e) => setA_endereco(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small-muted">numEndereco</label>
                  <input
                    id="a_numEndereco"
                    className="form-control form-control-sm"
                    value={a_numEndereco}
                    onChange={(e) => setA_numEndereco(e.target.value)}
                  />
                </div>

                <div className="col-4">
                  <label className="form-label small-muted">cep</label>
                  <input
                    id="a_cep"
                    className="form-control form-control-sm mono"
                    value={a_cep}
                    onChange={(e) => setA_cep(e.target.value)}
                  />
                </div>
                <div className="col-8">
                  <label className="form-label small-muted">bairro</label>
                  <input
                    id="a_bairro"
                    className="form-control form-control-sm"
                    value={a_bairro}
                    onChange={(e) => setA_bairro(e.target.value)}
                  />
                </div>

                <div className="col-8">
                  <label className="form-label small-muted">cidade</label>
                  <input
                    id="a_cidade"
                    className="form-control form-control-sm"
                    value={a_cidade}
                    onChange={(e) => setA_cidade(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small-muted">uf</label>
                  <input
                    id="a_uf"
                    className="form-control form-control-sm mono"
                    value={a_uf}
                    onChange={(e) => setA_uf(e.target.value)}
                  />
                </div>

                <div className="col-4">
                  <label className="form-label small-muted">banco_1</label>
                  <input
                    id="a_banco_1"
                    className="form-control form-control-sm mono"
                    value={a_banco_1}
                    onChange={(e) => setA_banco_1(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small-muted">agencia_1</label>
                  <input
                    id="a_agencia_1"
                    className="form-control form-control-sm mono"
                    value={a_agencia_1}
                    onChange={(e) => setA_agencia_1(e.target.value)}
                  />
                </div>
                <div className="col-4">
                  <label className="form-label small-muted">contaCorrente_1</label>
                  <input
                    id="a_contaCorrente_1"
                    className="form-control form-control-sm mono"
                    value={a_contaCorrente_1}
                    onChange={(e) => setA_contaCorrente_1(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small-muted">descricao_1</label>
                  <input
                    id="a_descricao_1"
                    className="form-control form-control-sm"
                    value={a_descricao_1}
                    onChange={(e) => setA_descricao_1(e.target.value)}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small-muted">nomeContato_1</label>
                  <input
                    id="a_nomeContato_1"
                    className="form-control form-control-sm"
                    value={a_nomeContato_1}
                    onChange={(e) => setA_nomeContato_1(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small-muted">nomeRepresentante_1</label>
                  <input
                    id="a_nomeRepresentante_1"
                    className="form-control form-control-sm"
                    value={a_nomeRepresentante_1}
                    onChange={(e) => setA_nomeRepresentante_1(e.target.value)}
                  />
                </div>

                <div className="col-6">
                  <label className="form-label small-muted">cpfRepresentante_1</label>
                  <input
                    id="a_cpfRepresentante_1"
                    className="form-control form-control-sm mono"
                    value={a_cpfRepresentante_1}
                    onChange={(e) => setA_cpfRepresentante_1(e.target.value)}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small-muted">valorProcesso</label>
                  <input
                    id="a_valorProcesso"
                    className="form-control form-control-sm"
                    value={a_valorProcesso}
                    onChange={(e) => setA_valorProcesso(e.target.value)}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label small-muted">dataProcessamento</label>
                  <input
                    id="a_dataProcessamento"
                    className="form-control form-control-sm mono"
                    value={a_dataProcessamento}
                    onChange={(e) => setA_dataProcessamento(e.target.value)}
                  />
                </div>
              </div>

              <div className="small-muted mt-2">
                Esse bloco salva dentro do documento na coleção <b>csv</b>.
              </div>
            </div>

            <div className="mb-3 mt-3">
              <button className="btn btn-primary w-100" id="btnSalvarMongo" onClick={saveMongo}>
                Salvar no Mongo (CSV + Regras)
              </button>

              <div
                id="saveStatus"
                className="small-muted mt-2"
                dangerouslySetInnerHTML={{ __html: saveStatus }}
              />
            </div>

            <hr />

            <div className="d-grid gap-2">
              <button className="btn btn-outline-primary" id="btnRodarKappi" onClick={actionKappi}>
                Re-rodar Kappi (API)
              </button>
              <button className="btn btn-outline-warning" id="btnRodarAnalise" onClick={actionAnalise}>
                Re-rodar Análise (API)
              </button>
              <button className="btn btn-outline-success" id="btnRodarSinqia" onClick={actionSinqia}>
                Re-rodar Sinqia (API)
              </button>
              <button className="btn btn-outline-dark" id="btnRodarEmail" onClick={actionEmail}>
                Re-rodar E-mail (API)
              </button>
            </div>

            <hr />

            <div className="d-grid gap-2">
              <button className="btn btn-secondary" id="btnExcelAnalise" onClick={excelAnalise}>
                Baixar Excel de Análise (API)
              </button>
              <button className="btn btn-secondary" id="btnExcelCadastro" onClick={excelCadastro}>
                Baixar Excel de Cadastro (API)
              </button>
            </div>
          </div>

          <div className="drawer-footer">
            <div className="small-muted">TRUE/FALSE são exibidos sem inversão.</div>
          </div>
        </div>

        {/* Modal genérico */}
        {appModalOpen && (
          <>
            <div className="modal-backdrop show" />
            <div className="modal show" style={{ display: "block" }} tabIndex={-1} aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{appModalTitle}</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Fechar"
                      onClick={() => setAppModalOpen(false)}
                    />
                  </div>
                  <div className="modal-body" dangerouslySetInnerHTML={{ __html: appModalBody }} />
                  <div className="modal-footer">
                    <button type="button" className="btn btn-primary" onClick={() => setAppModalOpen(false)}>
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal delete */}
        {deleteModalOpen && (
          <>
            <div className="modal-backdrop show" />
            <div className="modal show" style={{ display: "block" }} tabIndex={-1} aria-hidden="true">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Confirmar exclusão</h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Fechar"
                      onClick={() => setDeleteModalOpen(false)}
                    />
                  </div>
                  <div className="modal-body">
                    <div className="mb-2">Tem certeza que deseja excluir este registro?</div>
                    <div className="small text-muted">
                      ID: <span id="del_docid" className="mono">{pendingDeleteDocId || ""}</span>
                    </div>
                    <div className="small text-muted">Essa ação não pode ser desfeita.</div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setDeleteModalOpen(false)}>
                      Cancelar
                    </button>
                    <button type="button" className="btn btn-danger" id="btnConfirmDelete" onClick={confirmDelete}>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
