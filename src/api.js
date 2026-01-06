export const API_BASE = "http://localhost:5502";

// CSV upload/process
export const API_UPLOAD_PROCESSAR = `${API_BASE}/upload_processar_csv`;

// Table/list
export const API_ANALISE_CSV = `${API_BASE}/api/analise_csv`;

// CRUD CSV (Mongo)
export const API_CSV_GET = `${API_BASE}/api/csv/get`;
export const API_CSV_UPDATE = `${API_BASE}/api/csv/update`;
export const API_CSV_DELETE = `${API_BASE}/api/csv/delete`;
export const API_CSV_CREATE = `${API_BASE}/api/csv/create`;

// Actions (proxy/backend)
export const API_ACTION_KAPPI = `${API_BASE}/api/action/kappi`;
export const API_ACTION_ANALISE = `${API_BASE}/api/action/analise`;
export const API_ACTION_SINQIA = `${API_BASE}/api/action/sinqia`;
export const API_ACTION_EMAIL = `${API_BASE}/api/action/email`;

// Excel downloads
export const API_EXCEL_ANALISE = `${API_BASE}/api/action/excel_analise`;
export const API_EXCEL_CADASTRO = `${API_BASE}/api/action/excel_cadastro`;

// Helpers
export async function getJson(url) {
  const resp = await fetch(url, { method: "GET" });
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) throw new Error(data?.error || data?.message || text);
  return data;
}

export async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {})
  });
  const text = await resp.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) throw new Error(data?.error || data?.message || text);
  return data;
}

export async function postFormData(url, formData) {
  const resp = await fetch(url, {
    method: "POST",
    body: formData
  });
  const text = await resp.text();
  // seu backend pode responder HTML/texto; então só valida status
  if (!resp.ok) throw new Error(text || "Erro no upload");
  return text;
}
