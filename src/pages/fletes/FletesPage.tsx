// src/pages/fletes/FletesPage.tsx
import { Plus, Pencil, Trash2, Search, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";

/* =========================
   Types (API)
========================= */

type ApiFleteTarifa = {
  id: string;
  nombre: string;
  zona: string | null;
  destino: string | null;
  precio: number; // CLP
  activo: boolean;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
};

type Draft = {
  nombre: string;
  zona: string;
  destino: string;
  precio: string; // input
  activo: boolean;
  observacion: string;
};

type DialogMode = "create" | "edit";

type ApiErrorBody = {
  error?: string;
  message?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

type ApiError = Error & {
  status?: number;
  body?: ApiErrorBody;
};

/* =========================
   API helper
========================= */

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

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

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = (await safeJson(res)) as ApiErrorBody | null;
    const err: ApiError = new Error(body?.error || body?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body ?? undefined;
    throw err;
  }

  return (await safeJson(res)) as T;
}

/* =========================
   Helpers
========================= */

function emptyToNull(s: string) {
  const v = s.trim();
  return v ? v : null;
}

/**
 * Permite escribir "18000", "18.000", "$18.000", etc.
 * Por eso el input de precio es type="text" + inputMode="numeric".
 */
function parseClpInt(s: string) {
  const n = Number(String(s).replace(/[^\d]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function toDraft(f?: ApiFleteTarifa): Draft {
  return {
    nombre: f?.nombre ?? "",
    zona: f?.zona ?? "",
    destino: f?.destino ?? "",
    precio: f ? String(f.precio) : "",
    activo: f?.activo ?? true,
    observacion: f?.observacion ?? "",
  };
}

/* =========================
   Page - CRUD + paginación cliente (10)
========================= */

const PAGE_SIZE = 10;

export default function FletesPage() {
  const [items, setItems] = useState<ApiFleteTarifa[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  // paginación
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>(() => toDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      // Traemos todo y paginamos cliente (10) como pediste
      const data = await api<ApiFleteTarifa[]>("/fletes");
      setItems(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setLoadError(getErrorMessage(e, "No se pudieron cargar los fletes."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((f) => (onlyActive ? f.activo : true))
      .filter((f) => {
        if (!q) return true;
        return (
          f.nombre.toLowerCase().includes(q) ||
          (f.zona ?? "").toLowerCase().includes(q) ||
          (f.destino ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.activo === b.activo ? a.nombre.localeCompare(b.nombre) : a.activo ? -1 : 1));
  }, [items, query, onlyActive]);

  // reset page cuando cambian filtros/búsqueda
  useEffect(() => {
    setPage(1);
  }, [query, onlyActive]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  function clampPage(p: number) {
    return Math.min(Math.max(1, p), totalPages);
  }

  function goPrev() {
    setPage((p) => clampPage(p - 1));
  }

  function goNext() {
    setPage((p) => clampPage(p + 1));
  }

  function openCreate() {
    setDialogMode("create");
    setEditingId(null);
    setDraft(toDraft());
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(f: ApiFleteTarifa) {
    setDialogMode("edit");
    setEditingId(f.id);
    setDraft(toDraft(f));
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
  }

  function validate() {
    const nombre = draft.nombre.trim();
    const precio = parseClpInt(draft.precio);

    if (!nombre) return { ok: false as const, message: "El nombre es obligatorio." };
    if (nombre.length < 3) return { ok: false as const, message: "El nombre debe tener al menos 3 caracteres." };
    if (precio === null) return { ok: false as const, message: "El precio debe ser un número ≥ 0." };

    return {
      ok: true as const,
      value: {
        nombre,
        zona: emptyToNull(draft.zona),
        destino: emptyToNull(draft.destino),
        precio,
        activo: draft.activo,
        observacion: emptyToNull(draft.observacion),
      },
    };
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const v = validate();
    if (!v.ok) {
      setFormError(v.message);
      return;
    }

    setSaving(true);
    try {
      if (dialogMode === "create") {
        const created = await api<ApiFleteTarifa>("/fletes", {
          method: "POST",
          body: JSON.stringify(v.value),
        });

        // Insert arriba, y recalcular paginado (queremos que se vea)
        setItems((prev) => [created, ...prev]);
        setPage(1);
        closeDialog();
      } else {
        if (!editingId) {
          setFormError("No se encontró el flete a editar.");
          return;
        }
        const updated = await api<ApiFleteTarifa>(`/fletes/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(v.value),
        });

        setItems((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
        closeDialog();
      }
    } catch (e: unknown) {
      const msg =
        (e as ApiError)?.body?.error ||
        (e as ApiError)?.body?.message ||
        getErrorMessage(e, "No se pudo guardar el flete.");
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: ApiFleteTarifa) {
    const ok = window.confirm(`¿Eliminar "${f.nombre}"?`);
    if (!ok) return;

    setDeletingId(f.id);
    try {
      await api<void>(`/fletes/${f.id}`, { method: "DELETE" });

      setItems((prev) => prev.filter((x) => x.id !== f.id));

      // si borro el último item de la última página, ajusto page
      setPage((p) => {
        const nextTotal = totalItems - 1;
        const nextPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        return Math.min(p, nextPages);
      });
    } catch (e: unknown) {
      alert(getErrorMessage(e, "No se pudo eliminar."));
    } finally {
      setDeletingId(null);
    }
  }

  const previewMoney = money.format(parseClpInt(draft.precio) ?? 0);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <style>{`
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pop { 0% { transform: scale(.98); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .anim-slideDown { animation: slideDown .18s ease-out both; }
        .anim-pop { animation: pop .16s ease-out both; }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Tarifas</div>
          <div className="text-[12px] text-[var(--text-secondary)]">
            Lista de fletes (crear/editar/eliminar) — se agregan como cargo adicional en cotizaciones.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Buscar por nombre/zona/destino..."
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)] shadow-sm">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="h-4 w-4"
            />
            Solo activos
          </label>

          <Button
            variant="secondary"
            onClick={openCreate}
            className="px-3 transition-transform active:scale-[0.98]"
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Nuevo flete
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando fletes...
        </div>
      ) : loadError ? (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
          <div>{loadError}</div>
          <Button variant="secondary" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Zona</th>
                  <th className="px-3 py-2">Destino</th>
                  <th className="px-3 py-2 text-right">Precio</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Obs.</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">
                {pageItems.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-[var(--text-secondary)]" colSpan={7}>
                      Sin registros.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((f) => {
                    const deleting = deletingId === f.id;
                    return (
                      <tr key={f.id} className="bg-[var(--surface)] transition hover:bg-[var(--hover)]">
                        <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{f.nombre}</td>
                        <td className="px-3 py-2">{f.zona ?? "—"}</td>
                        <td className="px-3 py-2">{f.destino ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{money.format(f.precio)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              f.activo
                                ? "rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                                : "rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700"
                            }
                          >
                            {f.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                          {f.observacion ? (
                            <span title={f.observacion}>
                              {f.observacion.length > 44 ? `${f.observacion.slice(0, 44)}…` : f.observacion}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => openEdit(f)}
                              aria-label={`Editar ${f.nombre}`}
                              disabled={deleting}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => void handleDelete(f)}
                              aria-label={`Eliminar ${f.nombre}`}
                              disabled={deleting}
                              title="Eliminar"
                            >
                              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-[var(--text-secondary)]">
              Mostrando <b>{showingFrom}</b>–<b>{showingTo}</b> de <b>{totalItems}</b>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" size="icon" onClick={goPrev} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-secondary)] shadow-sm">
                Página <b>{page}</b> / <b>{totalPages}</b>
              </div>

              <Button variant="secondary" size="icon" onClick={goNext} disabled={page >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog */}
      {dialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={closeDialog}
            aria-label="Cerrar"
          />

          <div className="relative w-full max-w-xl rounded-2xl bg-[var(--surface)] p-4 shadow-xl anim-pop">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">{dialogMode === "create" ? "Nuevo flete" : "Editar flete"}</div>
              <Button variant="secondary" size="icon" onClick={closeDialog} aria-label="Cerrar" disabled={saving}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="space-y-1">
                <div className="text-xs font-medium text-[var(--text-primary)]">Nombre</div>
                <input
                  value={draft.nombre}
                  onChange={(e) => setDraft((c) => ({ ...c, nombre: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder='Ej: "Flete RM"'
                  required
                  disabled={saving}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Zona</div>
                  <input
                    value={draft.zona}
                    onChange={(e) => setDraft((c) => ({ ...c, zona: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="RM / V REGION / ..."
                    disabled={saving}
                  />
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Destino</div>
                  <input
                    value={draft.destino}
                    onChange={(e) => setDraft((c) => ({ ...c, destino: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Viña / Curicó / ..."
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Precio (CLP)</div>
                  <input
                    value={draft.precio}
                    onChange={(e) => setDraft((c) => ({ ...c, precio: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="0"
                    inputMode="numeric"
                    type="text"
                    disabled={saving}
                  />
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Vista previa: <b>{previewMoney}</b>
                  </div>
                </label>

                <label className="space-y-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Estado</div>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-sm">
                    <input
                      type="checkbox"
                      checked={draft.activo}
                      onChange={(e) => setDraft((c) => ({ ...c, activo: e.target.checked }))}
                      className="h-4 w-4"
                      disabled={saving}
                    />
                    <div className="text-sm">{draft.activo ? "Activo" : "Inactivo"}</div>
                  </div>
                </label>
              </div>

              <label className="space-y-1">
                <div className="text-xs font-medium text-[var(--text-primary)]">Observación</div>
                <textarea
                  value={draft.observacion}
                  onChange={(e) => setDraft((c) => ({ ...c, observacion: e.target.value }))}
                  className="min-h-[90px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Notas internas (opcional)"
                  disabled={saving}
                />
              </label>

              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 anim-slideDown">
                  {formError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={closeDialog} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="transition-transform active:scale-[0.98]">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : dialogMode === "create" ? (
                    "Crear"
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
