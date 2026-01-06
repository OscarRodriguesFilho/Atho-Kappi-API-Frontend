const DROP_KEYS = new Set(["_cpf_relation", "_cnpj_relation", "_diligence_id", "_rev", "_key"]);

const TITLE_PT = {
  "ELECTORAL DONORS": "Doadores eleitorais",
  "FEDERAL REVENUE STATUS": "Situação na Receita Federal",
  "SANCTIONS AND RESTRICTIONS": "Sanções e restrições",
  "NEGATIVE MEDIA": "Mídia negativa",
  "LEGAL PROCESS": "Processos judiciais",
  "CRIMINAL BACKGROUND - FEDERAL POLICE": "Antecedentes criminais - Polícia Federal",
};

const TYPE_PT = {
  REPUTATIONAL: "Reputacional",
  "DATA INTEGRITY": "Integridade de dados",
  "LEGAL PROCESS": "Processos",
};

const PT_MAP = {
  _id: "ID (Mongo)",
  id: "ID",
  _meta: "Metadados",
  saved_at: "Salvo em",
  source: "Fonte",
  consult_type: "Tipo de consulta",
  document: "Documento",
  extra: "Extra",
  status: "Status",
  raw: "Bruto (raw)",
  diligence_id: "Diligence ID",

  createdAt: "Criado em",
  client: "Cliente",
  hasError: "Teve erro",
  steps: "Etapas",
  user: "Usuário",
  version: "Versão",
  relation: "Relações",
  total: "Totais",
  PJcount: "Qtd. PJ",
  PFcount: "Qtd. PF",
  PEcount: "Qtd. PE",
  nodes: "Nós",
  links: "Ligações",
  name: "Nome",
  _color: "Cor",

  entities: "Entidades",
  step: "Etapa (step)",
  cnpj: "CNPJ",
  cnpj_basico: "CNPJ (básico)",
  cpf: "CPF",
  razao_social: "Razão social",
  nome_fantasia: "Nome fantasia",
  capital_social: "Capital social",
  data_inicio_atividade: "Início da atividade",
  email: "E-mail",
  is_filial: "É filial",
  is_mei: "É MEI",
  opcao_simples: "Opção Simples",
  is_simples: "Optante do Simples",
  data_opcao_pelo_simples: "Data opção Simples",

  telefone: "Telefone(s)",
  telefone_1: "Telefone 1",
  telefone_2: "Telefone 2",

  porte: "Porte",
  qualificacao_do_responsavel: "Qualificação do responsável",
  natureza_juridica: "Natureza jurídica",
  situacao_cadastral: "Situação cadastral",
  motivo: "Motivo",
  codigo: "Código",
  descricao: "Descrição",
  data: "Data",

  cnae: "CNAE",
  main_economic_activity: "Atividade econômica principal",
  secondary_economic_activities: "Atividades econômicas secundárias",
  secondary_activity: "Atividade secundária",

  endereco: "Endereço",
  uf: "UF",
  numero: "Número",
  bairro: "Bairro",
  municipio: "Município",
  logradouro: "Logradouro",
  logradouro_completo: "Logradouro completo",
  cep: "CEP",
  endereco_completo: "Endereço completo",

  analyses: "Análises",
  title: "Título",
  type: "Tipo",
  ok: "OK",
  severity: "Severidade",
  query_date: "Data da consulta",

  totalizers_per_document: "Totalizadores (por documento)",
  alerts_per_documento: "Alertas (por documento)",
  others: "Outros",
  assets: "Ativos",
  liabilities: "Passivos",
  compliant: "Conforme",
  critical: "Crítico",
  medium: "Médio",
  case_lists_by_document: "Lista de processos",

  process_number: "Número do processo",
  process_url: "Link do processo",
  case_movements: "Movimentações",
  process_class: "Classe processual",
  process_status: "Status do processo",
  degree: "Instância",
  state: "UF",
  alert: "Alerta",
  claim_value: "Valor da causa",
  subjects: "Assuntos",
  jurisdiction: "Ramo / Jurisdição",

  election_donations: "Doações eleitorais",
  news_found: "Notícias encontradas",
};

export function translateKey(key) {
  if (DROP_KEYS.has(key)) return null;
  const prettyFallback = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").trim();
  return PT_MAP[key] || prettyFallback;
}

export function translateTitle(t) {
  const k = (t || "").toString().trim().toUpperCase();
  return TITLE_PT[k] || t || "Sem título";
}

export function translateType(t) {
  const k = (t || "").toString().trim().toUpperCase();
  return TYPE_PT[k] || t || "—";
}

export function formatValue(v) {
  if (v == null) return "Sem dados";
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "TRUE") return "Sim";
    if (t === "FALSE") return "Não";
    if (t === "0") return "Não";
    if (t === "1") return "Sim";
    return v;
  }
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  return String(v);
}
