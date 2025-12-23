import { useMemo, useState } from 'react'

type ClientStatus = 'Activo' | 'Inactivo'

type Client = {
  id: string
  nombre: string
  rut: string
  email: string
  telefono: string
  estado: ClientStatus
}

type ClientDraft = Omit<Client, 'id'>

const initialClients: Client[] = [
  {
    id: 'cli-1',
    nombre: 'Ferreteria Norte',
    rut: '76.345.210-3',
    email: 'compras@ferreterianorte.cl',
    telefono: '+56 9 4321 7788',
    estado: 'Activo',
  },
  {
    id: 'cli-2',
    nombre: 'Constructora Andes',
    rut: '78.210.990-1',
    email: 'pagos@andes.cl',
    telefono: '+56 2 2456 1223',
    estado: 'Inactivo',
  },
]

const emptyDraft: ClientDraft = {
  nombre: '',
  rut: '',
  email: '',
  telefono: '',
  estado: 'Activo',
}

function createId() {
  return `cli-${Math.random().toString(36).slice(2, 10)}`
}

export default function ClientesPage() {
  const [items, setItems] = useState<Client[]>(initialClients)
  const [draft, setDraft] = useState<ClientDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)

  const isEditing = Boolean(editingId)
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [items],
  )

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!draft.nombre.trim()) return

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId ? { ...item, ...draft } : item,
        ),
      )
    } else {
      setItems((current) => [{ id: createId(), ...draft }, ...current])
    }

    setDraft(emptyDraft)
    setEditingId(null)
  }

  function handleEdit(item: Client) {
    setDraft({
      nombre: item.nombre,
      rut: item.rut,
      email: item.email,
      telefono: item.telefono,
      estado: item.estado,
    })
    setEditingId(item.id)
  }

  function handleDelete(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
    if (editingId === id) {
      setEditingId(null)
      setDraft(emptyDraft)
    }
  }

  function handleCancel() {
    setEditingId(null)
    setDraft(emptyDraft)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Gestion de clientes, contactos y condiciones comerciales.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_1.6fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <div className="text-sm font-semibold">
            {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
          </div>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Nombre
              </span>
              <input
                value={draft.nombre}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nombre: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: Ferreteria Norte"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                RUT
              </span>
              <input
                value={draft.rut}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    rut: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: 76.123.456-7"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Email
              </span>
              <input
                type="email"
                value={draft.email}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="correo@empresa.cl"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Telefono
              </span>
              <input
                value={draft.telefono}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    telefono: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="+56 9 1234 5678"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Estado
              </span>
              <select
                value={draft.estado}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    estado: event.target.value as ClientStatus,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--hover)]"
            >
              {isEditing ? 'Guardar cambios' : 'Guardar cliente'}
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={handleCancel}
                className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="text-sm font-semibold">Listado</div>
          {sortedItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
              No hay clientes registrados.
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--hover)] text-xs text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Contacto</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sortedItems.map((item) => (
                    <tr key={item.id} className="bg-[var(--surface)]">
                      <td className="px-3 py-2">
                        <div className="font-medium text-[var(--text-primary)]">
                          {item.nombre}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {item.rut}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">
                        <div>{item.email || 'Sin correo'}</div>
                        <div>{item.telefono || 'Sin telefono'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            item.estado === 'Activo'
                              ? 'inline-flex rounded-full bg-[var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]'
                              : 'inline-flex rounded-full bg-[var(--hover)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]'
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
                            onClick={() => handleDelete(item.id)}
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
          )}
        </div>
      </div>
    </div>
  )
}
