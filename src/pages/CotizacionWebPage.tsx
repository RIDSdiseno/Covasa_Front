import { useCallback, useEffect, useMemo, useState } from "react";

type ApiEstado = "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";

type ApiClienteSummary = {
  id: string;
  nombre: string | null;
  rut: string | null;
  email: string | null;
  telefono: string | null;
};

type ApiCotizacionListItem = {
  id: string;
  codigo: string;
  origen?: string | null;
  clienteId?: string | null;
  ecommerceClienteId?: string | null;
  estado: ApiEstado;
  createdAt: string;
  updatedAt: string;
  nombreContacto?: string | null;
  email?: string | null;
  telefono?: string | null;
  empresa?: string | null;
  rut?: string | null;
  subtotalNeto?: number;
  iva?: number;
  total?: number;
  cliente?: ApiClienteSummary | null;
  ecommerce_cliente?: ApiClienteSummary | null;
};

type UiCliente = {
  id: string;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  ultimaCotizacion: string | null;
};

type UiCotizacion = {
  id: string;
  codigo: string;
  estado: ApiEstado;
  createdAt: string;
  contacto: string;
  email: string;
  telefono: string;
  total: number;
};

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

const CLIENTS_PAGE_SIZE = 10;
const QUOTES_PAGE_SIZE = 10;
const FETCH_PAGE_SIZE = 200;

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

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

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
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
  const res = await fetch(joinUrl(API_BASE_URL, path), {
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
      (isRecord(data) && typeof data.message === "string" && data.message) ||
      `Error ${res.status} al llamar ${path}`;
    throw new Error(msg);
  }

  return data as T;
}

function parseListResponse<T>(payload: unknown, fallbackPageSize: number) {
  if (Array.isArray(payload)) {
    return {
      data: payload as T[],
      total: payload.length,
      page: 1,
      pageSize: fallbackPageSize,
      totalPages: 1,
    };
  }

  if (isRecord(payload)) {
    const data = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.items)
        ? payload.items
        : [];
    const rawTotal = Number(payload.total ?? data.length);
    const total = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : data.length;
    const rawPageSize = Number(payload.pageSize ?? fallbackPageSize);
    const pageSize =
      Number.isFinite(rawPageSize) && rawPageSize > 0 ? rawPageSize : fallbackPageSize;
    const rawTotalPages = Number(payload.totalPages ?? 0);
    const totalPages =
      Number.isFinite(rawTotalPages) && rawTotalPages > 0
        ? rawTotalPages
        : Math.max(1, Math.ceil((total || data.length) / pageSize));
    const rawPage = Number(payload.page ?? 1);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

    return { data: data as T[], total, page, pageSize, totalPages };
  }

  return { data: [] as T[], total: 0, page: 1, pageSize: fallbackPageSize, totalPages: 1 };
}

function statusLabel(estado: ApiEstado) {
  if (estado === "EN_REVISION") return "En revision";
  if (estado === "RESPONDIDA") return "Respondida";
  if (estado === "CERRADA") return "Cerrada";
  return "Nueva";
}

function statusPillClass(estado: ApiEstado) {
  if (estado === "EN_REVISION") return "bg-sky-50 text-sky-800 border-sky-200";
  if (estado === "RESPONDIDA") return "bg-amber-50 text-amber-800 border-amber-200";
  if (estado === "CERRADA") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-rose-50 text-rose-800 border-rose-200";
}

function toDateString(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 10);
}

function toTimestamp(value?: string | null) {
  if (!value) return 0;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function normalize(value?: string | null) {
  return (value ?? "").toString().toLowerCase().trim();
}

function isEcommerceRow(row: ApiCotizacionListItem) {
  const origin = row.origen?.trim();
  if (!origin) return true;
  return origin.toUpperCase() === "ECOMMERCE";
}

function getClientInfo(row: ApiCotizacionListItem) {
  return row.cliente ?? row.ecommerce_cliente ?? null;
}

function getClientKey(row: ApiCotizacionListItem) {
  const directId =
    row.clienteId?.trim() ||
    row.ecommerceClienteId?.trim() ||
    row.cliente?.id ||
    row.ecommerce_cliente?.id;
  if (directId) return directId;

  const email = row.email?.trim().toLowerCase();
  if (email) return `anon:${email}`;

  const name = row.nombreContacto?.trim().toLowerCase();
  if (name) return `anon:${name}`;

  return `anon:${row.id}`;
}

export default function CotizacionWebPage() {
  const [rows, setRows] = useState<ApiCotizacionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientsQuery, setClientsQuery] = useState("");
  const [clientsDebouncedQuery, setClientsDebouncedQuery] = useState("");
  const [clientsPage, setClientsPage] = useState(1);

  const [quotesQuery, setQuotesQuery] = useState("");
  const [quotesDebouncedQuery, setQuotesDebouncedQuery] = useState("");
  const [quotesPage, setQuotesPage] = useState(1);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const fetchCotizaciones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let page = 1;
      let totalPages = 1;
      const allRows: ApiCotizacionListItem[] = [];

      while (page <= totalPages) {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(FETCH_PAGE_SIZE));

        const payload = await api<unknown>(`/cotizaciones?${params.toString()}`);
        const parsed = parseListResponse<ApiCotizacionListItem>(payload, FETCH_PAGE_SIZE);

        allRows.push(...parsed.data);
        totalPages = parsed.totalPages;
        page += 1;
      }

      setRows(allRows);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar cotizaciones"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const ecommerceRows = useMemo(() => rows.filter(isEcommerceRow), [rows]);

  const clients = useMemo<UiCliente[]>(() => {
    const map = new Map<string, { client: UiCliente; lastTs: number }>();

    for (const row of ecommerceRows) {
      const clientKey = getClientKey(row);
      const clientInfo = getClientInfo(row);

      const baseName =
        clientInfo?.nombre?.trim() ||
        row.empresa?.trim() ||
        row.nombreContacto?.trim() ||
        row.email?.trim() ||
        row.rut?.trim() ||
        row.codigo?.trim() ||
        row.id.slice(0, 8).toUpperCase();

      const lastTs = toTimestamp(row.createdAt);
      const lastDate = toDateString(row.createdAt);

      const existing = map.get(clientKey);
      if (!existing || lastTs > existing.lastTs) {
        map.set(clientKey, {
          client: {
            id: clientKey,
            nombre: baseName,
            rut: clientInfo?.rut ?? row.rut ?? null,
            email: clientInfo?.email ?? row.email ?? null,
            telefono: clientInfo?.telefono ?? row.telefono ?? null,
            ultimaCotizacion: lastDate,
          },
          lastTs,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.lastTs - a.lastTs)
      .map((entry) => entry.client);
  }, [ecommerceRows]);

  const filteredClients = useMemo(() => {
    const q = normalize(clientsDebouncedQuery);
    if (!q) return clients;

    return clients.filter((client) => {
      const haystack = [client.nombre, client.rut, client.email, client.telefono]
        .map((value) => normalize(value))
        .join(" ");
      return haystack.includes(q);
    });
  }, [clients, clientsDebouncedQuery]);

  const clientsTotalItems = filteredClients.length;
  const clientsTotalPages = Math.max(1, Math.ceil(clientsTotalItems / CLIENTS_PAGE_SIZE));
  const clientsSafePage = Math.max(1, Math.min(clientsPage, clientsTotalPages));
  const clientsStartIndex = clientsTotalItems === 0 ? 0 : (clientsSafePage - 1) * CLIENTS_PAGE_SIZE + 1;
  const clientsEndIndex = Math.min(clientsTotalItems, clientsSafePage * CLIENTS_PAGE_SIZE);

  const clientsPageItems = useMemo(
    () =>
      filteredClients.slice(
        (clientsSafePage - 1) * CLIENTS_PAGE_SIZE,
        clientsSafePage * CLIENTS_PAGE_SIZE,
      ),
    [filteredClients, clientsSafePage],
  );

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  const selectedClientQuotes = useMemo(() => {
    if (!selectedClientId) return [];
    return ecommerceRows.filter((row) => getClientKey(row) === selectedClientId);
  }, [ecommerceRows, selectedClientId]);

  const filteredQuotes = useMemo(() => {
    const q = normalize(quotesDebouncedQuery);
    if (!q) return selectedClientQuotes;

    return selectedClientQuotes.filter((row) => {
      const haystack = [
        row.codigo,
        row.estado,
        row.nombreContacto,
        row.email,
        row.telefono,
        row.empresa,
        row.rut,
        row.cliente?.nombre,
        row.ecommerce_cliente?.nombre,
      ]
        .map((value) => normalize(value))
        .join(" ");
      return haystack.includes(q);
    });
  }, [quotesDebouncedQuery, selectedClientQuotes]);

  const quotesTotalItems = filteredQuotes.length;
  const quotesTotalPages = Math.max(1, Math.ceil(quotesTotalItems / QUOTES_PAGE_SIZE));
  const quotesSafePage = Math.max(1, Math.min(quotesPage, quotesTotalPages));
  const quotesStartIndex = quotesTotalItems === 0 ? 0 : (quotesSafePage - 1) * QUOTES_PAGE_SIZE + 1;
  const quotesEndIndex = Math.min(quotesTotalItems, quotesSafePage * QUOTES_PAGE_SIZE);

  const quotePageItems = useMemo<UiCotizacion[]>(() => {
    const slice = filteredQuotes.slice(
      (quotesSafePage - 1) * QUOTES_PAGE_SIZE,
      quotesSafePage * QUOTES_PAGE_SIZE,
    );
    return slice.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      estado: row.estado,
      createdAt: toDateString(row.createdAt) ?? "-",
      contacto:
        row.nombreContacto?.trim() ||
        row.empresa?.trim() ||
        row.cliente?.nombre?.trim() ||
        row.ecommerce_cliente?.nombre?.trim() ||
        row.email?.trim() ||
        "Contacto",
      email: row.email ?? "",
      telefono: row.telefono ?? "",
      total: Number(row.total ?? 0),
    }));
  }, [filteredQuotes, quotesSafePage]);

  useEffect(() => {
    setClientsPage(1);
    const timer = window.setTimeout(() => {
      setClientsDebouncedQuery(clientsQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [clientsQuery]);

  useEffect(() => {
    setQuotesPage(1);
    const timer = window.setTimeout(() => {
      setQuotesDebouncedQuery(quotesQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [quotesQuery]);

  useEffect(() => {
    fetchCotizaciones();
  }, [fetchCotizaciones]);

  useEffect(() => {
    if (clientsPage > clientsTotalPages) setClientsPage(clientsTotalPages);
  }, [clientsPage, clientsTotalPages]);

  useEffect(() => {
    if (quotesPage > quotesTotalPages) setQuotesPage(quotesTotalPages);
  }, [quotesPage, quotesTotalPages]);

  useEffect(() => {
    if (filteredClients.length === 0) {
      setSelectedClientId(null);
      return;
    }
    if (!selectedClientId || !filteredClients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(filteredClients[0].id);
    }
  }, [filteredClients, selectedClientId]);

  useEffect(() => {
    setQuotesPage(1);
  }, [selectedClientId]);

  function handleClientsClear() {
    setClientsQuery("");
    setClientsDebouncedQuery("");
    setClientsPage(1);
  }

  function handleQuotesClear() {
    setQuotesQuery("");
    setQuotesDebouncedQuery("");
    setQuotesPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cotizacion web</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Selecciona un cliente y revisa las cotizaciones recibidas desde el ecommerce.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Clientes ecommerce</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-72">
                <input
                  value={clientsQuery}
                  onChange={(event) => setClientsQuery(event.target.value)}
                  placeholder="Buscar por nombre, rut, correo..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>

              <button
                type="button"
                onClick={handleClientsClear}
                disabled={!clientsQuery.trim()}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => void fetchCotizaciones()}
                disabled={loading}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                {loading ? "Cargando..." : "Refrescar"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Cargando clientes...
            </div>
          ) : clientsPageItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay clientes ecommerce registrados.
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                  Mostrando{" "}
                  <span className="font-medium text-[var(--text-primary)]">{clientsStartIndex}</span>
                  {" - "}
                  <span className="font-medium text-[var(--text-primary)]">{clientsEndIndex}</span> de{" "}
                  <span className="font-medium text-[var(--text-primary)]">{clientsTotalItems}</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setClientsPage((page) => Math.max(1, page - 1))}
                    disabled={clientsSafePage === 1}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                  >
                    Anterior
                  </button>

                  <div className="text-xs text-[var(--text-secondary)]">
                    Pagina{" "}
                    <span className="font-medium text-[var(--text-primary)]">{clientsSafePage}</span> de{" "}
                    <span className="font-medium text-[var(--text-primary)]">{clientsTotalPages}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setClientsPage((page) => Math.min(clientsTotalPages, page + 1))}
                    disabled={clientsSafePage === clientsTotalPages}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--hover)] text-xs text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Cliente</th>
                      <th className="px-3 py-2 font-medium">Contacto</th>
                      <th className="px-3 py-2 font-medium">Ultima cotizacion</th>
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {clientsPageItems.map((client) => (
                      <tr
                        key={client.id}
                        className={selectedClientId === client.id ? "bg-[var(--hover)]" : "bg-[var(--surface)]"}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--text-primary)]">{client.nombre}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {client.rut ? `RUT: ${client.rut}` : "RUT: -"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>{client.email || "-"}</div>
                          <div>{client.telefono || "-"}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          {client.ultimaCotizacion || "-"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedClientId(client.id)}
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold">Cotizaciones del cliente</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                {selectedClient
                  ? `${selectedClient.nombre}${selectedClient.email ? ` - ${selectedClient.email}` : ""}`
                  : "Selecciona un cliente para ver sus cotizaciones."}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-72">
                <input
                  value={quotesQuery}
                  onChange={(event) => setQuotesQuery(event.target.value)}
                  placeholder="Buscar por codigo, estado..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>

              <button
                type="button"
                onClick={handleQuotesClear}
                disabled={!quotesQuery.trim()}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => void fetchCotizaciones()}
                disabled={loading || !selectedClientId}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                {loading ? "Cargando..." : "Refrescar"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!selectedClientId ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Selecciona un cliente para ver sus cotizaciones.
            </div>
          ) : loading ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Cargando cotizaciones...
            </div>
          ) : quotePageItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay cotizaciones para este cliente.
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                  Mostrando{" "}
                  <span className="font-medium text-[var(--text-primary)]">{quotesStartIndex}</span>
                  {" - "}
                  <span className="font-medium text-[var(--text-primary)]">{quotesEndIndex}</span> de{" "}
                  <span className="font-medium text-[var(--text-primary)]">{quotesTotalItems}</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQuotesPage((page) => Math.max(1, page - 1))}
                    disabled={quotesSafePage === 1}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                  >
                    Anterior
                  </button>

                  <div className="text-xs text-[var(--text-secondary)]">
                    Pagina{" "}
                    <span className="font-medium text-[var(--text-primary)]">{quotesSafePage}</span> de{" "}
                    <span className="font-medium text-[var(--text-primary)]">{quotesTotalPages}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setQuotesPage((page) => Math.min(quotesTotalPages, page + 1))}
                    disabled={quotesSafePage === quotesTotalPages}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--hover)] text-xs text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Codigo / Fecha</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Contacto</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {quotePageItems.map((quote) => (
                      <tr key={quote.id} className="bg-[var(--surface)]">
                        <td className="px-3 py-2">
                          <div className="text-[var(--text-primary)]">{quote.codigo}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{quote.createdAt || "-"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${statusPillClass(
                              quote.estado,
                            )}`}
                          >
                            {statusLabel(quote.estado)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>{quote.contacto || "-"}</div>
                          <div>{quote.email || "-"}</div>
                          <div>{quote.telefono || "-"}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {money.format(quote.total || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
