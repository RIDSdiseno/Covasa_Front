import { useCallback, useEffect, useMemo, useState } from "react";

type ApiEstado = "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";

type ApiCotizacionListItem = {
  id: string;
  codigo: string;
  origen?: string | null;
  estado: ApiEstado;
  createdAt: string;
  updatedAt: string;
  nombreContacto: string;
  email: string;
  telefono: string;
  empresa: string | null;
  rut: string | null;
  subtotalNeto: number;
  iva: number;
  total: number;
};

type ApiListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: ApiCotizacionListItem[];
};

type UiCotizacion = {
  id: string;
  codigo: string;
  origen?: string | null;
  estado: ApiEstado;
  createdAt: string;
  cliente: string;
  rut: string | null;
  contacto: string;
  email: string;
  telefono: string;
  total: number;
};

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

const PAGE_SIZE = 10;

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

function shouldShowEcommerceOnly(rows: ApiCotizacionListItem[]) {
  return rows.some((row) => typeof row.origen === "string" && row.origen.trim() !== "");
}

function isEcommerceOrigin(origen?: string | null) {
  if (!origen) return false;
  const normalized = origen.trim().toUpperCase();
  return normalized !== "MANUAL";
}

export default function CotizacionWebPage() {
  const [items, setItems] = useState<UiCotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const totalItems = total > 0 ? total : items.length;
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.max(1, Math.min(page, safeTotalPages));
  const startIndex = totalItems === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(totalItems, safePage * PAGE_SIZE);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      params.set("page", String(safePage));
      params.set("pageSize", String(PAGE_SIZE));

      const res = await api<ApiListResponse>(`/cotizaciones?${params.toString()}`);

      const rawRows = res.data ?? [];
      const filterEcommerce = shouldShowEcommerceOnly(rawRows);

      const mapped: UiCotizacion[] = rawRows
        .filter((row) => (filterEcommerce ? isEcommerceOrigin(row.origen) : true))
        .map((row) => ({
        id: row.id,
        codigo: row.codigo,
        origen: row.origen ?? null,
        estado: row.estado,
        createdAt: (row.createdAt ?? "").slice(0, 10),
        cliente: (row.empresa && row.empresa.trim()) || row.nombreContacto || "Cliente",
        rut: row.rut,
        contacto: row.nombreContacto || "",
        email: row.email || "",
        telefono: row.telefono || "",
        total: Number(row.total ?? 0),
      }));

      setItems(mapped);
      setTotal(res.total ?? mapped.length);
      setTotalPages(res.totalPages ?? Math.max(1, Math.ceil((res.total ?? mapped.length) / PAGE_SIZE)));
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar cotizaciones"));
      setItems([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, safePage]);

  useEffect(() => {
    setPage(1);
    const t = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (page > safeTotalPages) setPage(safeTotalPages);
  }, [page, safeTotalPages]);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  function handleClear() {
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cotizacion web</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cotizaciones recibidas desde el ecommerce para coordinar la interaccion remota con el vendedor.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="text-sm font-semibold">Detalle de cotizacion</div>

          {selected ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Cliente</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {selected.cliente}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Contacto</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {selected.contacto || "Sin contacto"}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Rut</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {selected.rut || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Fecha</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {selected.createdAt || "-"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Correo</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {selected.email || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Telefono</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {selected.telefono || "-"}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Estado</div>
                  <div
                    className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(
                      selected.estado,
                    )}`}
                  >
                    {statusLabel(selected.estado)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Total</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold">
                    {money.format(selected.total || 0)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Selecciona una cotizacion del listado para ver el detalle.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Listado</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-72">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, rut, contacto, correo..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>

              <button
                type="button"
                onClick={handleClear}
                disabled={!query.trim()}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => void fetchList()}
                disabled={loading}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                {loading ? "Cargando..." : "Refrescar"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Cargando cotizaciones...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay cotizaciones registradas.
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                  Mostrando{" "}
                  <span className="font-medium text-[var(--text-primary)]">{startIndex}</span>
                  {" - "}
                  <span className="font-medium text-[var(--text-primary)]">{endIndex}</span> de{" "}
                  <span className="font-medium text-[var(--text-primary)]">{totalItems}</span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                  >
                    Anterior
                  </button>

                  <div className="text-xs text-[var(--text-secondary)]">
                    Pagina{" "}
                    <span className="font-medium text-[var(--text-primary)]">{safePage}</span> de{" "}
                    <span className="font-medium text-[var(--text-primary)]">{safeTotalPages}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(safeTotalPages, p + 1))}
                    disabled={safePage === safeTotalPages}
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
                      <th className="px-3 py-2 font-medium">Codigo / Fecha</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={selectedId === item.id ? "bg-[var(--hover)]" : "bg-[var(--surface)]"}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--text-primary)]">{item.cliente}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {item.rut ? `RUT: ${item.rut}` : "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>{item.contacto || "Sin contacto"}</div>
                          <div>{item.email || "-"}</div>
                          <div>{item.telefono || "-"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-[var(--text-primary)]">{item.codigo}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{item.createdAt || "-"}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold ${statusPillClass(
                              item.estado,
                            )}`}
                          >
                            {statusLabel(item.estado)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          {money.format(item.total || 0)}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSelectedId(item.id)}
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
      </div>
    </div>
  );
}
