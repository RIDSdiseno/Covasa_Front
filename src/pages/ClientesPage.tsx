import React, { useEffect, useMemo, useState } from "react";

type ClientStatus = "Activo" | "Inactivo";

/** ✅ Enum (debe calzar con tu Prisma enum EcommerceMetodoPago) */
type MetodoPagoUnico = "TRANSBANK" | "APPLE_PAY" | "TRANSFERENCIA" | "OTRO";

type Client = {
  id: string;
  nombre: string | null;
  rut: string | null;

  email: string | null;
  telefono: string | null;
  personaContacto: string | null;

  direccion: string | null;
  comuna: string | null;
  ciudad: string | null;
  region: string | null;

  estado: ClientStatus;

  // ✅ nuevos
  lineaCredito: number | null;
  metodoPagoUnico: MetodoPagoUnico | null;
  vendedorId?: string | null;
};

type ClientDraft = {
  nombre: string;
  rut: string;

  email: string;
  telefono: string;
  personaContacto: string;

  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;

  estado: ClientStatus;

  // ✅ nuevos
  lineaCredito: string; // input como string
  metodoPagoUnico: MetodoPagoUnico; // seleccionado al crear
};

type ApiErrorBody = {
  message?: string;
  error?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  "http://localhost:3000/api";

const emptyDraft: ClientDraft = {
  nombre: "",
  rut: "",
  email: "",
  telefono: "",
  personaContacto: "",
  direccion: "",
  comuna: "",
  ciudad: "",
  region: "",
  estado: "Activo",

  lineaCredito: "0",
  metodoPagoUnico: "TRANSFERENCIA",
};

/* =======================
   Modal confirmación
======================= */

type ConfirmKind = "save" | "delete";

type ConfirmState =
  | { open: false }
  | {
      open: true;
      kind: ConfirmKind;
      title: string;
      description?: string;
      confirmText: string;
      cancelText: string;
      danger?: boolean;
      onConfirm: () => void;
    };

function ConfirmModal({
  state,
  onClose,
  busy,
}: {
  state: ConfirmState;
  onClose: () => void;
  busy: boolean;
}) {
  if (!state.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={busy ? undefined : onClose}
        aria-label="Cerrar"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <div className="text-base font-semibold text-[var(--text-primary)]">
          {state.title}
        </div>

        {state.description ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {state.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
          >
            {state.cancelText}
          </button>

          <button
            type="button"
            onClick={state.onConfirm}
            disabled={busy}
            className={
              state.danger
                ? "inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                : "inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--hover)] disabled:opacity-60"
            }
          >
            {busy ? "Procesando..." : state.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   RUT auto-formateo
======================= */

function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean;

  const dv = clean.slice(-1);
  let body = clean.slice(0, -1);

  body = body.replace(/^0+/, "");
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${withDots}-${dv}`;
}

function rutOnChange(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return formatRut(trimmed);
}

/* =======================
   Helpers búsqueda
======================= */

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cleanRutForSearch(rut?: string | null): string {
  return (rut ?? "").toString().replace(/[^0-9kK]/g, "").toUpperCase();
}

function clientMatches(item: Client, q: string): boolean {
  const needle = normalizeText(q);
  if (!needle) return true;

  const rutRaw = cleanRutForSearch(item.rut);
  const queryRaw = cleanRutForSearch(q);

  if (queryRaw.length >= 6 && rutRaw.includes(queryRaw)) return true;

  const haystack = normalizeText(
    [
      item.nombre ?? "",
      item.rut ?? "",
      item.email ?? "",
      item.telefono ?? "",
      item.personaContacto ?? "",
      item.direccion ?? "",
      item.comuna ?? "",
      item.ciudad ?? "",
      item.region ?? "",
      item.estado ?? "",
      item.metodoPagoUnico ?? "",
      String(item.lineaCredito ?? ""),
      item.id ?? "",
    ].join(" ")
  );

  return haystack.includes(needle);
}

/* =======================
   Helpers generales
======================= */

function toDraft(c: Client): ClientDraft {
  return {
    nombre: c.nombre ?? "",
    rut: c.rut ?? "",

    email: c.email ?? "",
    telefono: c.telefono ?? "",
    personaContacto: c.personaContacto ?? "",

    direccion: c.direccion ?? "",
    comuna: c.comuna ?? "",
    ciudad: c.ciudad ?? "",
    region: c.region ?? "",

    estado: c.estado,

    lineaCredito: String(c.lineaCredito ?? 0),
    metodoPagoUnico: (c.metodoPagoUnico ?? "TRANSFERENCIA") as MetodoPagoUnico,
  };
}

function normalizeForApi(draft: ClientDraft) {
  const creditoN = Number(
    String(draft.lineaCredito ?? "0").replace(/[^\d.-]/g, "")
  );
  const lineaCredito = Number.isFinite(creditoN)
    ? Math.max(0, Math.trunc(creditoN))
    : 0;

  return {
    nombre: draft.nombre.trim(),
    rut: draft.rut.trim(),

    email: draft.email.trim(),
    telefono: draft.telefono.trim(),
    personaContacto: draft.personaContacto.trim(),

    direccion: draft.direccion.trim(),
    comuna: draft.comuna.trim(),
    ciudad: draft.ciudad.trim(),
    region: draft.region.trim(),

    estado: draft.estado,

    lineaCredito,
    metodoPagoUnico: draft.metodoPagoUnico,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (!isRecord(value)) return false;
  return "message" in value || "error" in value || "issues" in value;
}

async function safeJson(res: globalThis.Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
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
    const body = isApiErrorBody(data) ? data : undefined;

    const issueMsg =
      body?.issues && body.issues.length > 0
        ? body.issues[0]?.message
        : undefined;

    const msg =
      issueMsg ||
      body?.message ||
      body?.error ||
      `Error ${res.status} al llamar ${path}`;
    throw new Error(msg);
  }

  return data as T;
}

export default function ClientesPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({ open: false });

  const [query, setQuery] = useState<string>("");

  const PAGE_SIZE = 10;
  const [page, setPage] = useState<number>(1);

  const isEditing = Boolean(editingId);

  const filteredItems = useMemo(() => {
    const q = query.trim();
    return items.filter((it) => clientMatches(it, q));
  }, [items, query]);

  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) =>
        (a.nombre ?? "").localeCompare(b.nombre ?? "")
      ),
    [filteredItems]
  );

  useEffect(() => {
    setPage(1);
  }, [query, items.length]);

  const total = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIndex = (safePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, total);

  const pageItems = useMemo(
    () => sortedItems.slice(startIndex, endIndex),
    [sortedItems, startIndex, endIndex]
  );

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const clientes = await api<Client[]>("/clientes");
      setItems(clientes ?? []);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "No se pudo cargar clientes"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function doSave(): Promise<void> {
    setSaving(true);
    try {
      const payload = normalizeForApi(draft);

      if (editingId) {
        // ✅ metodoPagoUnico NO editable: lo removemos para no mandar al backend
        const { metodoPagoUnico, ...payloadEdit } = payload;

        const updated = await api<Client>(`/clientes/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payloadEdit),
        });

        setItems((current) =>
          current.map((it) => (it.id === editingId ? updated : it))
        );
      } else {
        const created = await api<Client>("/clientes", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setItems((current) => [created, ...current]);
      }

      setDraft(emptyDraft);
      setEditingId(null);
      setConfirm({ open: false });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function doDelete(id: string): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      await api<void>(`/clientes/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((it) => it.id !== id));

      if (editingId === id) {
        setEditingId(null);
        setDraft(emptyDraft);
      }

      setConfirm({ open: false });
    } catch (e: unknown) {
      setError(getErrorMessage(e, "No se pudo eliminar"));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    setError(null);

    if (!draft.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!draft.rut.trim()) return setError("El RUT es obligatorio.");

    const creditoN = Number(
      String(draft.lineaCredito ?? "0").replace(/[^\d.-]/g, "")
    );
    if (!Number.isFinite(creditoN) || creditoN < 0)
      return setError("La línea de crédito debe ser un número >= 0.");

    const title = isEditing ? "Confirmar edición" : "Confirmar creación";
    const confirmText = isEditing ? "Guardar cambios" : "Crear cliente";

    setConfirm({
      open: true,
      kind: "save",
      title,
      description: `Se guardará el cliente "${draft.nombre.trim()}" (${draft.rut.trim()}).`,
      confirmText,
      cancelText: "Cancelar",
      danger: false,
      onConfirm: () => void doSave(),
    });
  }

  function handleEdit(item: Client): void {
    setDraft(toDraft(item));
    setEditingId(item.id);
    setError(null);
  }

  function handleAskDelete(item: Client): void {
    setConfirm({
      open: true,
      kind: "delete",
      title: "Confirmar eliminación",
      description: `Vas a eliminar el cliente "${item.nombre ?? "Sin nombre"}" (${
        item.rut ?? "—"
      }). Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      danger: true,
      onConfirm: () => void doDelete(item.id),
    });
  }

  function handleCancel(): void {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
  }

  function closeModal(): void {
    if (saving) return;
    setConfirm({ open: false });
  }

  return (
    <div className="space-y-6">
      <ConfirmModal state={confirm} onClose={closeModal} busy={saving} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gestión de clientes, crédito y método de pago.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <div className="text-sm font-semibold">
            {isEditing ? "Editar cliente" : "Nuevo cliente"}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Nombre
              </span>
              <input
                value={draft.nombre}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, nombre: e.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: Ferretería Norte"
                disabled={saving}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                RUT
              </span>
              <input
                value={draft.rut}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, rut: rutOnChange(e.target.value) }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: 76.123.456-7"
                disabled={saving}
                inputMode="text"
                autoComplete="off"
              />
            </label>

            {/* Crédito + Pago */}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Línea de crédito (CLP)
                </span>
                <input
                  value={draft.lineaCredito}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, lineaCredito: e.target.value }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Ej: 500000"
                  disabled={saving}
                  inputMode="numeric"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Método de pago único
                </span>
                <select
                  value={draft.metodoPagoUnico}
                  onChange={(e) =>
                    setDraft((c) => ({
                      ...c,
                      metodoPagoUnico: e.target.value as MetodoPagoUnico,
                    }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  disabled={saving || isEditing}
                  title={
                    isEditing
                      ? "Este campo no se puede editar después de crear el cliente"
                      : undefined
                  }
                >
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TRANSBANK">Transbank</option>
                  <option value="APPLE_PAY">Apple Pay</option>
                  <option value="OTRO">Otro</option>
                </select>

                {isEditing ? (
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    * Se define al crear el cliente y luego queda bloqueado.
                  </span>
                ) : null}
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Persona de contacto
              </span>
              <input
                value={draft.personaContacto}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, personaContacto: e.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: Juan Pérez"
                disabled={saving}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Email
              </span>
              <input
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, email: e.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="correo@empresa.cl"
                disabled={saving}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Teléfono
              </span>
              <input
                value={draft.telefono}
                onChange={(e) =>
                  setDraft((c) => ({ ...c, telefono: e.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="+56 9 1234 5678"
                disabled={saving}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Dirección
                </span>
                <input
                  value={draft.direccion}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, direccion: e.target.value }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Ej: Av. Providencia 123"
                  disabled={saving}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Comuna
                </span>
                <input
                  value={draft.comuna}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, comuna: e.target.value }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Ej: Providencia"
                  disabled={saving}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Ciudad
                </span>
                <input
                  value={draft.ciudad}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, ciudad: e.target.value }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Ej: Santiago"
                  disabled={saving}
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Región
                </span>
                <input
                  value={draft.region}
                  onChange={(e) =>
                    setDraft((c) => ({ ...c, region: e.target.value }))
                  }
                  className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                  placeholder="Ej: Metropolitana"
                  disabled={saving}
                />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Estado
              </span>
              <select
                value={draft.estado}
                onChange={(e) =>
                  setDraft((c) => ({
                    ...c,
                    estado: e.target.value as ClientStatus,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                disabled={saving}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--hover)] disabled:opacity-60"
            >
              {isEditing ? "Guardar cambios" : "Guardar cliente"}
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold">Listado</div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="w-full sm:w-72">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, RUT, contacto, comuna, crédito..."
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                />
              </div>

              <button
                type="button"
                onClick={() => setQuery("")}
                disabled={!query.trim()}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                {loading ? "Cargando..." : "Refrescar"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              Cargando clientes...
            </div>
          ) : items.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay clientes registrados.
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay resultados para "{query.trim()}".
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[var(--text-secondary)]">
                  Mostrando{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {total === 0 ? 0 : startIndex + 1}
                  </span>
                  {"–"}
                  <span className="font-medium text-[var(--text-primary)]">
                    {endIndex}
                  </span>{" "}
                  de{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {total}
                  </span>
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
                    Página{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      {safePage}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium text-[var(--text-primary)]">
                      {totalPages}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
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
                      <th className="px-3 py-2 font-medium">Crédito / Pago</th>
                      <th className="px-3 py-2 font-medium">Contacto</th>
                      <th className="px-3 py-2 font-medium">Ubicación</th>
                      <th className="px-3 py-2 font-medium">Estado</th>
                      <th className="px-3 py-2 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {pageItems.map((item) => (
                      <tr key={item.id} className="bg-[var(--surface)]">
                        <td className="px-3 py-2">
                          <div className="font-medium text-[var(--text-primary)]">
                            {item.nombre ?? "Sin nombre"}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {item.rut ?? "—"}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>
                            <span className="text-[var(--text-primary)] font-medium">
                              $
                              {Number(item.lineaCredito ?? 0).toLocaleString(
                                "es-CL"
                              )}
                            </span>{" "}
                            <span>crédito</span>
                          </div>
                          <div>
                            Pago:{" "}
                            <span className="text-[var(--text-primary)] font-medium">
                              {item.metodoPagoUnico ?? "—"}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>
                            {item.personaContacto || "Sin persona de contacto"}
                          </div>
                          <div>{item.email || "Sin correo"}</div>
                          <div>{item.telefono || "Sin teléfono"}</div>
                        </td>

                        <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                          <div>{item.direccion || "—"}</div>
                          <div>
                            {[item.comuna, item.ciudad]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                          <div>{item.region || "—"}</div>
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={
                              item.estado === "Activo"
                                ? "inline-flex rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]"
                                : "inline-flex rounded-full bg-[var(--hover)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]"
                            }
                          >
                            {item.estado}
                          </span>
                        </td>

                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAskDelete(item)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
