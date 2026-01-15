import { useEffect, useMemo, useState } from "react";

type WorkerStatus = "Activo" | "Inactivo";
type WorkerRole = "Ventas" | "Cobranza" | "Bodega" | "Administracion";

type Worker = {
  id: string;
  nombre: string;
  cargo: WorkerRole;
  email: string;
  telefono: string | null;
  estado: WorkerStatus;
  tenantId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type WorkerDraft = {
  nombre: string;
  cargo: WorkerRole;
  email: string;
  telefono: string;
  estado: WorkerStatus;
};

const emptyDraft: WorkerDraft = {
  nombre: "",
  cargo: "Ventas",
  email: "",
  telefono: "",
  estado: "Activo",
};

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://localhost:3000/api";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function TrabajadoresPage() {
  const [items, setItems] = useState<Worker[]>([]);
  const [draft, setDraft] = useState<WorkerDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const isEditing = Boolean(editingId);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [items]
  );

  async function load() {
    setBusy(true);
    setPageError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/trabajadores?take=200`);
      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.error || body?.message || "No se pudo cargar trabajadores");
      }
      const data = (await res.json()) as { items: Worker[] };
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e: any) {
      setPageError(e?.message || "Error cargando trabajadores");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError(null);

    if (!draft.nombre.trim()) return;

    setBusy(true);
    try {
      if (editingId) {
        // PATCH
        const res = await fetch(`${API_BASE_URL}/trabajadores/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: draft.nombre,
            cargo: draft.cargo,
            email: draft.email,
            telefono: draft.telefono || null,
            estado: draft.estado,
          }),
        });

        if (!res.ok) {
          const body = await safeJson(res);
          throw new Error(body?.error || body?.message || "No se pudo actualizar");
        }

        const updated = (await res.json()) as Worker;
        setItems((current) => current.map((w) => (w.id === updated.id ? updated : w)));
      } else {
        // POST
        const res = await fetch(`${API_BASE_URL}/trabajadores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: draft.nombre,
            cargo: draft.cargo,
            email: draft.email,
            telefono: draft.telefono || null,
            estado: draft.estado,
          }),
        });

        if (!res.ok) {
          const body = await safeJson(res);
          throw new Error(body?.error || body?.message || "No se pudo crear");
        }

        const created = (await res.json()) as Worker;
        setItems((current) => [created, ...current]);
      }

      setDraft(emptyDraft);
      setEditingId(null);
    } catch (e: any) {
      setPageError(e?.message || "Error guardando trabajador");
    } finally {
      setBusy(false);
    }
  }

  function handleEdit(item: Worker) {
    setDraft({
      nombre: item.nombre ?? "",
      cargo: item.cargo,
      email: item.email ?? "",
      telefono: item.telefono ?? "",
      estado: item.estado,
    });
    setEditingId(item.id);
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar trabajador?")) return;

    setBusy(true);
    setPageError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/trabajadores/${id}`, {
        method: "DELETE",
      });

      if (!res.ok && res.status !== 204) {
        const body = await safeJson(res);
        throw new Error(body?.error || body?.message || "No se pudo eliminar");
      }

      setItems((current) => current.filter((w) => w.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setDraft(emptyDraft);
      }
    } catch (e: any) {
      setPageError(e?.message || "Error eliminando trabajador");
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trabajadores</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gestion de trabajadores, roles y asignaciones.
        </p>
      </div>

      {pageError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">
              {isEditing ? "Editar trabajador" : "Nuevo trabajador"}
            </div>
            {busy ? (
              <span className="text-xs text-[var(--text-secondary)]">Guardando...</span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Nombre</span>
              <input
                value={draft.nombre}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, nombre: event.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: Camila Rojas"
                disabled={busy}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Cargo</span>
              <select
                value={draft.cargo}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cargo: event.target.value as WorkerRole,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                disabled={busy}
              >
                <option value="Ventas">Ventas</option>
                <option value="Cobranza">Cobranza</option>
                <option value="Bodega">Bodega</option>
                <option value="Administracion">Administracion</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Email</span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, email: event.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder={`correo@covasachile.cl`}
                disabled={busy}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Telefono</span>
              <input
                value={draft.telefono}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, telefono: event.target.value }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="+56 9 1234 5678"
                disabled={busy}
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Estado</span>
              <select
                value={draft.estado}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estado: event.target.value as WorkerStatus,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                disabled={busy}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--hover)] disabled:opacity-60"
            >
              {isEditing ? "Guardar cambios" : "Guardar trabajador"}
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="button"
              onClick={load}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
            >
              Recargar
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold">Listado</div>
            {busy ? <div className="text-xs text-[var(--text-secondary)]">Cargando...</div> : null}
          </div>

          {sortedItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay trabajadores registrados.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--hover)] text-xs text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Trabajador</th>
                    <th className="px-3 py-2 font-medium">Contacto</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="bg-[var(--surface)]">
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--text-primary)]">{item.nombre}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{item.cargo}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                        <div>{item.email || "Sin correo"}</div>
                        <div>{item.telefono || "Sin telefono"}</div>
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
                            disabled={busy}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            disabled={busy}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
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
          )}
        </div>
      </div>
    </div>
  );
}
