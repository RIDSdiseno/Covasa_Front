// src/pages/cotizaciones/CotizacionesPage.tsx
import { GripVertical, Sparkles, ExternalLink, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { cn } from "../../lib/cn";
import CreateCotizacionModal from "./CreateCotizacionModal";

type ApiEstadoCotizacion = "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";

type ApiCotizacionListItem = {
  id: string;
  codigo: string;
  correlativo: number;
  origen: string;

  clienteId: string | null;

  nombreContacto: string;
  email: string;
  telefono: string;
  empresa: string | null;
  rut: string | null;

  subtotalNeto: number;
  iva: number;
  total: number;

  estado: ApiEstadoCotizacion;

  createdAt: string;
  updatedAt: string;

  itemsCount?: number;

  Cliente?: { id: string; nombre: string; rut: string | null } | null;

  crmCotizacionId?: string | null;
  crmCotizacion?: { id: string } | null;
};

type ApiListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: ApiCotizacionListItem[];
};

type ConvertToCrmResponse =
  | {
      alreadyLinked: true;
      ecommerceCotizacionId: string;
      crmCotizacionId: string;
      crmCotizacion: { id: string } | null;
    }
  | {
      alreadyLinked: false;
      crmCotizacion: { id: string };
      ecommerceCotizacion: { id: string; estado: ApiEstadoCotizacion; crmCotizacionId: string };
    };

// ✅ OJO:
// Este API_BASE_URL asume que montaste tus rutas así:
// app.use("/api/cotizaciones", cotizacionesRoutes)
// Si en tu server tienes app.use("/api", cotizacionesRoutes) entonces NO existe /api/cotizaciones.
// En ese caso, cambia el fetch a "/" (NO recomendado) o arregla el mount en backend.
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

const OPORTUNIDAD_ROUTE_PREFIX = "/crm/cotizaciones";

async function safeJson(res: globalThis.Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await safeJson(res);

  if (!res.ok) {
    const msg =
      (isRecord(data) && (typeof data.message === "string" ? data.message : "")) ||
      `Error ${res.status} al llamar ${path}`;
    throw new Error(msg);
  }

  return data as T;
}

/** =========================
 *  UI model (Kanban)
 * ========================= */

type CotizacionStatus = "pendiente" | "negociacion" | "ganada" | "perdida";

type UiCotizacion = {
  id: string;
  codigo: string;
  cliente: string;
  total: number;
  creadaEl: string;

  status: CotizacionStatus;
  apiEstado: ApiEstadoCotizacion;

  oportunidadId: string | null;
};

const columns: Array<{
  key: CotizacionStatus;
  label: string;
  helper: string;
  apiEstado: ApiEstadoCotizacion;
}> = [
  { key: "pendiente", label: "Pendiente", helper: "Por iniciar", apiEstado: "NUEVA" },
  { key: "negociacion", label: "En negociación", helper: "Cotización en curso", apiEstado: "EN_REVISION" },
  { key: "ganada", label: "Ganada", helper: "Cerrada como ganada", apiEstado: "CERRADA" },
  { key: "perdida", label: "Perdida", helper: "Cerrada como perdida", apiEstado: "RESPONDIDA" },
];

function apiEstadoToUiStatus(estado: ApiEstadoCotizacion): CotizacionStatus {
  if (estado === "CERRADA") return "ganada";
  if (estado === "RESPONDIDA") return "perdida";
  if (estado === "EN_REVISION") return "negociacion";
  return "pendiente"; // NUEVA
}

function uiStatusToApiEstado(status: CotizacionStatus): ApiEstadoCotizacion {
  const col = columns.find((c) => c.key === status);
  return col?.apiEstado ?? "NUEVA";
}

export default function CotizacionesPage() {
  const navigate = useNavigate();

  const [openCreate, setOpenCreate] = useState(false);

  const [items, setItems] = useState<UiCotizacion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [busyMove, setBusyMove] = useState<boolean>(false);

  const [busyOpo, setBusyOpo] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CotizacionStatus | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    []
  );

  function toUi(row: ApiCotizacionListItem): UiCotizacion {
    const clienteNombre = row.Cliente?.nombre || row.empresa || row.nombreContacto || "Sin nombre";
    const oportunidadId = row.crmCotizacionId ?? row.crmCotizacion?.id ?? null;

    return {
      id: row.id,
      codigo: row.codigo,
      cliente: clienteNombre,
      total: Number(row.total ?? 0),
      creadaEl: (row.createdAt ?? "").slice(0, 10),
      apiEstado: row.estado,
      status: apiEstadoToUiStatus(row.estado),
      oportunidadId,
    };
  }

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      // ✅ requiere backend en /api/cotizaciones (mount recomendado)
      const resp = await api<ApiListResponse>("/cotizaciones?page=1&pageSize=200");
      const list = (resp?.data ?? []).map(toUi);
      list.sort((a, b) => (b.creadaEl || "").localeCompare(a.creadaEl || ""));
      setItems(list);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "No se pudieron cargar las cotizaciones"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openOportunidad(oportunidadId: string) {
    navigate(`${OPORTUNIDAD_ROUTE_PREFIX}/${oportunidadId}`);
  }

  async function patchEstado(cotizacionId: string, estado: ApiEstadoCotizacion) {
    setBusyMove(true);
    setError(null);

    // optimistic UI
    setItems((current) =>
      current.map((it) =>
        it.id === cotizacionId ? { ...it, apiEstado: estado, status: apiEstadoToUiStatus(estado) } : it
      )
    );

    try {
      await api(`/cotizaciones/${cotizacionId}`, {
        method: "PATCH",
        body: JSON.stringify({ estado }),
      });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "No se pudo cambiar el estado"));
      await load();
    } finally {
      setBusyMove(false);
    }
  }

  async function createOportunidad(cotizacionId: string) {
    if (busyMove) return;
    setError(null);

    setBusyOpo((p) => {
      if (p[cotizacionId]) return p;
      return { ...p, [cotizacionId]: true };
    });

    const prev = items;
    setItems((current) => current.map((it) => (it.id === cotizacionId ? { ...it } : it)));

    try {
      const resp = await api<ConvertToCrmResponse>(`/cotizaciones/${cotizacionId}/convert-to-crm`, {
        method: "POST",
      });

      const oppId =
        "alreadyLinked" in resp && resp.alreadyLinked ? resp.crmCotizacionId : resp.crmCotizacion.id;

      // al crear oportunidad lo dejamos en negociación (EN_REVISION)
      setItems((current) =>
        current.map((it) =>
          it.id === cotizacionId
            ? {
                ...it,
                oportunidadId: oppId,
                apiEstado: "EN_REVISION",
                status: apiEstadoToUiStatus("EN_REVISION"),
              }
            : it
        )
      );

      void load();
    } catch (e: unknown) {
      setItems(prev);
      setError(getErrorMessage(e, "No se pudo crear la oportunidad"));
    } finally {
      setBusyOpo((p) => ({ ...p, [cotizacionId]: false }));
    }
  }

  function handleDrop(status: CotizacionStatus, cotizacionId: string) {
    if (busyMove) return;
    void patchEstado(cotizacionId, uiStatusToApiEstado(status));
  }

  function handleDropOnColumn(status: CotizacionStatus, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropTarget(null);
    const cotizacionId = event.dataTransfer.getData("text/plain") || draggingId;
    if (!cotizacionId) return;
    handleDrop(status, cotizacionId);
  }

  function handleDragStart(cotizacionId: string, event: DragEvent<HTMLDivElement>) {
    setDraggingId(cotizacionId);
    event.dataTransfer.setData("text/plain", cotizacionId);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Cotizaciones</div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">
              Kanban conectado al backend. Estados: <b>Pendiente</b>, <b>En negociación</b>, <b>Ganada</b>, <b>Perdida</b>.
              Desde cada tarjeta puedes crear una <b>Oportunidad</b> (CRM).
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setOpenCreate(true)} disabled={loading || busyMove} className="px-3">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Nueva cotización
            </Button>

            <Button variant="secondary" onClick={() => void load()} className="px-3" disabled={loading || busyMove}>
              {loading ? "Cargando..." : "Refrescar"}
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 overflow-x-auto pb-2">
        {columns.map((column) => {
          const colItems = items.filter((it) => it.status === column.key);
          const highlighted = dropTarget === column.key;

          return (
            <div
              key={column.key}
              className={cn(
                "rounded-2xl border border-[var(--border)] bg-[var(--hover)] p-3",
                highlighted ? "ring-2 ring-primary" : null
              )}
              onDragOver={(event) => {
                event.preventDefault();
                if (dropTarget !== column.key) setDropTarget(column.key);
              }}
              onDrop={(event) => handleDropOnColumn(column.key, event)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{column.label}</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">{column.helper}</div>
                </div>
                <div className="rounded-xl bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-sm">
                  {colItems.length}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-60)] p-4 text-xs text-[var(--text-secondary)]">
                    Cargando...
                  </div>
                ) : colItems.length ? (
                  colItems.map((cotizacion) => {
                    const creatingOpp = Boolean(busyOpo[cotizacion.id]);

                    return (
                      <div
                        key={cotizacion.id}
                        draggable={!busyMove}
                        onDragStart={(event) => handleDragStart(cotizacion.id, event)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm",
                          draggingId === cotizacion.id ? "opacity-60" : "hover:border-[var(--border)]",
                          busyMove ? "cursor-not-allowed opacity-80" : null
                        )}
                        title={busyMove ? "Procesando..." : undefined}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 text-[var(--text-secondary)]">
                                <GripVertical className="h-4 w-4" aria-hidden="true" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                  {cotizacion.cliente}
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                                  <span className="font-medium text-[var(--text-primary)]">{cotizacion.codigo}</span>
                                  <span>{cotizacion.creadaEl}</span>
                                  <span>{money.format(cotizacion.total)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Oportunidad */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {cotizacion.oportunidadId ? (
                            <>
                              <span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[11px] font-medium text-[var(--primary)]">
                                Oportunidad creada
                              </span>

                              <Button
                                variant="secondary"
                                onClick={() => openOportunidad(cotizacion.oportunidadId!)}
                                className="h-8 px-2 text-xs"
                              >
                                <ExternalLink className="mr-1 h-4 w-4" aria-hidden="true" />
                                Ver
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => void createOportunidad(cotizacion.id)}
                              disabled={creatingOpp || busyMove}
                              title="Crea una CrmCotizacion y la vincula a esta cotización"
                              className="h-8 px-2 text-xs"
                            >
                              <Sparkles className="mr-1 h-4 w-4" aria-hidden="true" />
                              {creatingOpp ? "Creando..." : "Crear oportunidad"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-60)] p-4 text-xs text-[var(--text-secondary)]">
                    Suelta aquí una cotización.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal crear cotización */}
      <CreateCotizacionModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => void load()}
      />
    </div>
  );
}
