import { FileText, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import { cn } from "../../lib/cn";

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

/* =========================
   API helpers (sin any)
========================= */

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;

  const data = await safeJson(res);
  if (!res.ok) {
    const msg =
      (isRecord(data) && typeof data.message === "string" && data.message) || `Error ${res.status} en ${path}`;
    throw new Error(msg);
  }
  return data as T;
}

/* =========================
   Tipos UI
========================= */

type CotizacionStatus = "pendiente" | "en_proceso" | "realizada";

type DocumentoAdjunto = {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

type CotizacionHeader = {
  folio?: string | null;
  fechaEmision?: string | null;
  clienteNombre: string;
  clienteRut?: string | null;
  correo?: string | null;
};

type CotizacionItem = {
  id: string;
  nro: number;
  descripcion: string;
  unidad: string;
  cantidad: number;
  netoUnitario: number;
  netoTotal: number;
};

type CotizacionTotales = {
  subtotalNeto: number;
  iva: number;
  totalBruto: number;
};

type Cotizacion = {
  id: string;
  status: CotizacionStatus;
  creadaEl: string;
  header: CotizacionHeader;
  items: CotizacionItem[];
  totales: CotizacionTotales;
  documento?: DocumentoAdjunto;
};

/* =========================
   Tipos Backend (shape esperado)
========================= */

type ApiEstado = "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";

type ApiListRow = {
  id: string;
  codigo: string;
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

  itemsCount?: number;
};

type ApiListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: ApiListRow[];
};

type ApiDetailItem = {
  id: string;
  descripcionSnapshot: string;
  cantidad: number;
  precioUnitarioNetoSnapshot: number;
  subtotalNetoSnapshot: number;
  ivaPctSnapshot: number;
  ivaMontoSnapshot: number;
  totalSnapshot: number;
  Producto?: { unidadMedida?: string | null; sku?: string | null; nombre?: string | null } | null;
};

type ApiDetail = ApiListRow & {
  EcommerceCotizacionItem: ApiDetailItem[];
  // si luego agregas archivo en backend puedes incluirlo aquí
};

function apiEstadoToUi(estado: ApiEstado): CotizacionStatus {
  if (estado === "NUEVA") return "pendiente";
  if (estado === "EN_REVISION") return "en_proceso";
  return "realizada";
}

function uiToApiEstado(s: CotizacionStatus): ApiEstado {
  if (s === "pendiente") return "NUEVA";
  if (s === "en_proceso") return "EN_REVISION";
  return "CERRADA"; // o RESPONDIDA, depende tu negocio
}

function statusLabel(s: CotizacionStatus) {
  if (s === "pendiente") return "Cotización";
  if (s === "en_proceso") return "En proceso";
  return "Para facturar";
}

function statusPillClass(s: CotizacionStatus) {
  if (s === "pendiente") return "bg-amber-50 text-amber-800 border-amber-200";
  if (s === "en_proceso") return "bg-sky-50 text-sky-800 border-sky-200";
  return "bg-emerald-50 text-emerald-800 border-emerald-200";
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const decimals = value >= 10 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

type FinalizeDialogState =
  | {
      cotizacionId: string;
      file: File | null;
      error: string | null;
    }
  | null;

export default function CotizacionesListPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<CotizacionStatus | "todas">("todas");

  // paginado simple
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);

  // modal detalle
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Cotizacion | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  // modal facturar (subir doc)
  const [finalizeDialog, setFinalizeDialog] = useState<FinalizeDialogState>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    []
  );

  async function fetchList() {
    setBusy(true);
    setError(null);
    try {
      const estadoParam =
        status === "todas"
          ? ""
          : uiToApiEstado(status); // NUEVA / EN_REVISION / CERRADA

      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (estadoParam) params.set("estado", estadoParam);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await api<ApiListResponse>(`/cotizaciones?${params.toString()}`);

      const mapped: Cotizacion[] = (res.data ?? []).map((r) => {
        const clienteNombre = (r.empresa && r.empresa.trim()) || r.nombreContacto || "Cliente";
        return {
          id: r.id,
          status: apiEstadoToUi(r.estado),
          creadaEl: (r.createdAt || "").slice(0, 10),
          header: {
            folio: r.codigo,
            fechaEmision: (r.createdAt || "").slice(0, 10),
            clienteNombre,
            clienteRut: r.rut,
            correo: r.email,
          },
          items: [], // se llena solo en detalle
          totales: {
            subtotalNeto: r.subtotalNeto ?? 0,
            iva: r.iva ?? 0,
            totalBruto: r.total ?? 0,
          },
          documento: undefined, // si luego guardas doc en backend, lo mapeas aquí
        };
      });

      setCotizaciones(mapped);
      setTotalPages(res.totalPages ?? 1);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar cotizaciones"));
      setCotizaciones([]);
      setTotalPages(1);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  // cuando cambia q, volvemos a página 1 y recargamos con un pequeño debounce
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      fetchList();
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function openDetail(id: string) {
    setDetailId(id);
    setDetail(null);
    setDetailBusy(true);
    try {
      const row = await api<ApiDetail>(`/cotizaciones/${id}`);

      const clienteNombre = (row.empresa && row.empresa.trim()) || row.nombreContacto || "Cliente";
      const items = (row.EcommerceCotizacionItem ?? []).map((it, idx) => ({
        id: it.id,
        nro: idx + 1,
        descripcion: it.descripcionSnapshot || "Producto",
        unidad: it.Producto?.unidadMedida || "UN",
        cantidad: it.cantidad ?? 0,
        netoUnitario: it.precioUnitarioNetoSnapshot ?? 0,
        netoTotal: it.subtotalNetoSnapshot ?? 0,
      }));

      const mapped: Cotizacion = {
        id: row.id,
        status: apiEstadoToUi(row.estado),
        creadaEl: (row.createdAt || "").slice(0, 10),
        header: {
          folio: row.codigo,
          fechaEmision: (row.createdAt || "").slice(0, 10),
          clienteNombre,
          clienteRut: row.rut,
          correo: row.email,
        },
        items,
        totales: {
          subtotalNeto: row.subtotalNeto ?? 0,
          iva: row.iva ?? 0,
          totalBruto: row.total ?? 0,
        },
      };

      setDetail(mapped);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo cargar el detalle"));
      setDetail(null);
    } finally {
      setDetailBusy(false);
    }
  }

  async function deleteCotizacion(id: string) {
    if (!confirm("¿Eliminar esta cotización?")) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/cotizaciones/${id}`, { method: "DELETE" });
      // refrescar lista
      await fetchList();
      if (detailId === id) setDetailId(null);
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo eliminar"));
    } finally {
      setBusy(false);
    }
  }

  function openFinalizeDialog(cotizacionId: string) {
    setFinalizeDialog({ cotizacionId, file: null, error: null });
  }
  function closeFinalizeDialog() {
    setFinalizeDialog(null);
  }

  async function handleConfirmFinalize() {
    if (!finalizeDialog) return;

    // ⚠️ acá solo cambiamos estado en backend.
    // subir archivo real requiere endpoint multipart (te lo armamos si quieres)
    setBusy(true);
    setError(null);
    try {
      await api(`/cotizaciones/${finalizeDialog.cotizacionId}`, {
        method: "PATCH",
        body: JSON.stringify({ estado: "CERRADA" satisfies ApiEstado }),
      });

      setFinalizeDialog(null);
      await fetchList();
    } catch (e) {
      setError(getErrorMessage(e, "No se pudo pasar a facturar"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Lista de cotizaciones</div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              Se cargan desde el backend (GET /cotizaciones).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-9 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar (cliente, código, rut, email...)"
            />

            <select
              className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as CotizacionStatus | "todas")}
            >
              <option value="todas">Todas</option>
              <option value="pendiente">Cotización</option>
              <option value="en_proceso">En proceso</option>
              <option value="realizada">Para facturar</option>
            </select>

            <Button variant="secondary" className="h-9 px-3" onClick={fetchList} disabled={busy}>
              {busy ? "Cargando..." : "Refrescar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs text-[var(--text-secondary)]">
                <th className="sticky left-0 z-10 bg-[var(--surface)] px-3 py-2">ID</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Código / Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Ítems</th>
                <th className="px-3 py-2">Documento</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={8} className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
                    Cargando...
                  </td>
                </tr>
              ) : cotizaciones.length ? (
                cotizaciones.map((c) => (
                  <tr key={c.id} className="text-sm">
                    <td className="sticky left-0 z-10 border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                      <div className="font-semibold text-[var(--text-primary)]">{c.id.slice(0, 8).toUpperCase()}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{c.creadaEl}</div>
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3">
                      <div className="font-semibold text-[var(--text-primary)]">{c.header.clienteNombre}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {c.header.clienteRut ? `RUT: ${c.header.clienteRut}` : "—"}
                        {c.header.correo ? ` · ${c.header.correo}` : ""}
                      </div>
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3">
                      <div className="text-[var(--text-primary)]">{c.header.folio ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{c.header.fechaEmision ?? c.creadaEl}</div>
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
                          statusPillClass(c.status)
                        )}
                      >
                        {statusLabel(c.status)}
                      </span>
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3 text-right font-semibold">
                      {money.format(c.totales.totalBruto || 0)}
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3 text-right">
                      {/* si el backend trae itemsCount lo mostramos, si no, 0 */}
                      {(
                        (c.items.length || 0) // detalle
                      ).toLocaleString("es-CL")}
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3">
                      {c.documento ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <FileText className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden="true" />
                          <span className="truncate text-xs text-[var(--text-primary)]">{c.documento.name}</span>
                          <span className="text-[11px] text-[var(--text-secondary)]">· {formatFileSize(c.documento.size)}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">—</span>
                      )}
                    </td>

                    <td className="border-t border-[var(--border)] px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => openDetail(c.id)}>
                          Ver
                        </Button>

                        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => openFinalizeDialog(c.id)}>
                          A facturar
                        </Button>

                        <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => deleteCotizacion(c.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="border-t border-[var(--border)] px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
                    No hay cotizaciones para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginado simple */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-[var(--text-secondary)]">
            Página <b>{page}</b> de <b>{totalPages}</b>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="h-8 px-3 text-xs" disabled={busy || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button variant="secondary" className="h-8 px-3 text-xs" disabled={busy || page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Modal detalle */}
      {detailId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[var(--overlay)]" onClick={() => setDetailId(null)} aria-label="Cerrar" />

          <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Detalle cotización</div>
              <Button variant="secondary" size="icon" onClick={() => setDetailId(null)} aria-label="Cerrar">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            {detailBusy ? (
              <div className="mt-4 text-sm text-[var(--text-secondary)]">Cargando detalle...</div>
            ) : detail ? (
              <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--hover)] p-4">
                <div className="text-xs text-[var(--text-secondary)]">Cliente</div>
                <div className="mt-1 text-sm font-semibold">{detail.header.clienteNombre}</div>

                <div className="mt-2 text-xs text-[var(--text-secondary)]">
                  {detail.header.folio ? `Código: ${detail.header.folio} · ` : ""}
                  {detail.header.fechaEmision ? `Fecha: ${detail.header.fechaEmision}` : `Creada: ${detail.creadaEl}`}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-[var(--surface)] p-3">
                    <div className="text-[11px] text-[var(--text-secondary)]">Subtotal neto</div>
                    <div className="mt-1 font-semibold">{money.format(detail.totales.subtotalNeto || 0)}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface)] p-3">
                    <div className="text-[11px] text-[var(--text-secondary)]">IVA</div>
                    <div className="mt-1 font-semibold">{money.format(detail.totales.iva || 0)}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--surface)] p-3">
                    <div className="text-[11px] text-[var(--text-secondary)]">Total</div>
                    <div className="mt-1 font-semibold">{money.format(detail.totales.totalBruto || 0)}</div>
                  </div>
                </div>

                {detail.items.length ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Ítems</div>
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[640px] border-separate border-spacing-0">
                        <thead>
                          <tr className="text-left text-xs text-[var(--text-secondary)]">
                            <th className="px-2 py-2">#</th>
                            <th className="px-2 py-2">Descripción</th>
                            <th className="px-2 py-2">Unidad</th>
                            <th className="px-2 py-2 text-right">Cant.</th>
                            <th className="px-2 py-2 text-right">Neto unit.</th>
                            <th className="px-2 py-2 text-right">Neto total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((it) => (
                            <tr key={it.id}>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs">{it.nro}</td>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs">{it.descripcion}</td>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs">{it.unidad}</td>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs text-right">
                                {it.cantidad.toLocaleString("es-CL")}
                              </td>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs text-right">
                                {money.format(it.netoUnitario || 0)}
                              </td>
                              <td className="border-t border-[var(--border)] px-2 py-2 text-xs text-right">
                                {money.format(it.netoTotal || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-[var(--text-secondary)]">Sin ítems.</div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm text-[var(--text-secondary)]">No se pudo cargar el detalle.</div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDetailId(null)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  if (!detailId) return;
                  setDetailId(null);
                  openFinalizeDialog(detailId);
                }}
              >
                A facturar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: pasar a facturar (estado) */}
      {finalizeDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[var(--overlay)]" onClick={closeFinalizeDialog} aria-label="Cerrar" />

          <div className="relative w-full max-w-lg rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Pasar a facturar</div>
              <Button variant="secondary" size="icon" onClick={closeFinalizeDialog} aria-label="Cerrar">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-2 text-sm text-[var(--text-primary)]">
              Esto marcará la cotización como <span className="font-semibold">CERRADA</span> en el backend.
            </div>

            {/* si aún quieres exigir archivo en UI, lo dejamos pero no lo sube */}
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-primary)]">
              <Upload className="h-5 w-5 text-[var(--text-secondary)]" aria-hidden="true" />
              <div className="mt-2 font-semibold">Seleccionar archivo (opcional)</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">Luego hacemos endpoint para subirlo</div>
              <input
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setFinalizeDialog((cur) => (cur ? { ...cur, file, error: null } : cur));
                }}
              />
            </label>

            {finalizeDialog.file ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{finalizeDialog.file.name}</span>
                  <span className="shrink-0 text-xs text-[var(--text-secondary)]">{formatFileSize(finalizeDialog.file.size)}</span>
                </div>
              </div>
            ) : null}

            {finalizeDialog.error ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {finalizeDialog.error}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={closeFinalizeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmFinalize} disabled={busy}>
                {busy ? "Guardando..." : "Enviar a facturar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
