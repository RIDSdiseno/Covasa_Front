type ApiErrorBody = { message?: string };

export type CrmCotizacion = {
  id: string;
  correlativo: number;
  codigo: string;
  origen: string;
  ecommerceClienteId: string | null;
  clienteId: string | null;
  nombreContacto: string;
  email: string;
  telefono: string;
  empresa: string | null;
  rut: string | null;
  observaciones: string | null;
  ocCliente: string | null;
  subtotalNeto: number;
  iva: number;
  total: number;
  estado: "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";
  createdAt: string;
  updatedAt: string;
  crmCotizacionId: string | null;
};

export type CrmListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CrmListResponse = {
  data: CrmCotizacion[];
  meta: CrmListMeta;
};

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getAuthToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token") ||
    ""
  );
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const base = API_BASE_URL.replace(/\/+$/, "");
  const url = `${base}/${path.replace(/^\/+/, "")}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await safeJson(res);
  if (!res.ok) {
    const msg =
      (isRecord(data) &&
        (data as ApiErrorBody).message &&
        String((data as ApiErrorBody).message)) ||
      `Error ${res.status} al llamar ${path}`;
    throw new Error(msg);
  }

  return data as T;
}

export async function fetchCrmCotizaciones(params: {
  estado?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const qs = new URLSearchParams();
  if (params.estado) qs.set("estado", params.estado);
  if (params.q) qs.set("q", params.q);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));

  const path = `crm/cotizaciones?${qs.toString()}`;
  return api<CrmListResponse>(path);
}

export async function fetchCrmCotizacionById(id: string) {
  const data = await api<{ data: CrmCotizacion }>(`crm/cotizaciones/${encodeURIComponent(id)}`);
  return data.data;
}
