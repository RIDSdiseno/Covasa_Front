import { Pencil, Plus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import Button from '../../components/ui/Button'

type StockRow = {
  id: string
  inventarioId: string
  sku: string
  producto: string
  foto?: string
  precio: number
  stock: number
  minimo: number
}

type StockRowDraft = {
  inventarioId: string
  sku: string
  producto: string
  foto: string
  precio: string
  stock: string
  minimo: string
}

type DialogMode = 'create' | 'edit'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const initialRows: StockRow[] = [
  {
    id: createId(),
    inventarioId: 'INV-001',
    sku: 'SKU-001',
    producto: 'Producto X',
    precio: 12990,
    stock: 24,
    minimo: 20,
  },
  {
    id: createId(),
    inventarioId: 'INV-002',
    sku: 'SKU-002',
    producto: 'Producto Y',
    precio: 8990,
    stock: 12,
    minimo: 15,
  },
  {
    id: createId(),
    inventarioId: 'INV-003',
    sku: 'SKU-003',
    producto: 'Producto Z',
    precio: 1990,
    stock: 5,
    minimo: 10,
  },
]

function toDraft(row?: StockRow): StockRowDraft {
  return {
    inventarioId: row?.inventarioId ?? '',
    sku: row?.sku ?? '',
    producto: row?.producto ?? '',
    foto: row?.foto ?? '',
    precio: row ? String(row.precio) : '',
    stock: row ? String(row.stock) : '',
    minimo: row ? String(row.minimo) : '',
  }
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function parseNonNegativeInteger(value: string) {
  const parsed = parseNonNegativeNumber(value)
  if (parsed === null || !Number.isInteger(parsed)) return null
  return parsed
}

export default function InventarioStockPage() {
  const [rows, setRows] = useState<StockRow[]>(initialRows)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StockRowDraft>(() => toDraft())
  const [formError, setFormError] = useState<string | null>(null)

  const money = useMemo(
    () =>
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      }),
    [],
  )

  function openCreateDialog() {
    setDialogMode('create')
    setEditingId(null)
    setDraft(toDraft())
    setFormError(null)
    setDialogOpen(true)
  }

  function openEditDialog(row: StockRow) {
    setDialogMode('edit')
    setEditingId(row.id)
    setDraft(toDraft(row))
    setFormError(null)
    setDialogOpen(true)
  }

  function closeDialog() {
    setDialogOpen(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    const inventarioId = draft.inventarioId.trim()
    const sku = draft.sku.trim()
    const producto = draft.producto.trim()
    const foto = draft.foto.trim()
    const precio = parseNonNegativeNumber(draft.precio)
    const stock = parseNonNegativeInteger(draft.stock)
    const minimo = parseNonNegativeInteger(draft.minimo)

    if (!inventarioId) return setFormError('El ID de inventario es obligatorio.')
    if (!sku) return setFormError('El SKU es obligatorio.')
    if (!producto) return setFormError('El nombre del producto es obligatorio.')
    if (precio === null) return setFormError('El precio debe ser un número ≥ 0.')
    if (stock === null) return setFormError('El stock debe ser un entero ≥ 0.')
    if (minimo === null) return setFormError('El mínimo debe ser un entero ≥ 0.')

    const skuLower = sku.toLowerCase()
    const skuInUse = rows.some((row) => {
      if (dialogMode === 'edit' && row.id === editingId) return false
      return row.sku.toLowerCase() === skuLower
    })
    if (skuInUse) return setFormError('Ya existe un producto con ese SKU.')

    if (dialogMode === 'create') {
      const newRow: StockRow = {
        id: createId(),
        inventarioId,
        sku,
        producto,
        foto: foto || undefined,
        precio,
        stock,
        minimo,
      }
      setRows((current) => [newRow, ...current])
      closeDialog()
      return
    }

    if (!editingId) return setFormError('No se encontró el producto a editar.')

    setRows((current) =>
      current.map((row) =>
        row.id === editingId
          ? {
              ...row,
              inventarioId,
              sku,
              producto,
              foto: foto || undefined,
              precio,
              stock,
              minimo,
            }
          : row,
      ),
    )
    closeDialog()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold">Stock y alertas (demo)</div>
        <Button variant="secondary" onClick={openCreateDialog} className="px-3">
          <Plus className="h-4 w-4" aria-hidden="true" />
          Agregar producto
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Foto</th>
              <th className="px-3 py-2">ID inventario</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2 text-right">Precio</th>
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Mínimo</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const low = row.stock < row.minimo
              return (
                <tr key={row.id} className="bg-white">
                  <td className="px-3 py-2">
                    {row.foto ? (
                      <img
                        src={row.foto}
                        alt={`Foto de ${row.producto}`}
                        className="h-10 w-10 rounded-xl border border-slate-200 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] font-medium uppercase text-slate-500">
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{row.inventarioId}</td>
                  <td className="px-3 py-2">{row.sku}</td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {row.producto}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {money.format(row.precio)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        low
                          ? 'rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700'
                          : 'rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'
                      }
                    >
                      {row.stock}
                    </span>
                  </td>
                  <td className="px-3 py-2">{row.minimo}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => openEditDialog(row)}
                      aria-label={`Editar ${row.producto}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {dialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeDialog}
            aria-label="Cerrar"
          />
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">
                {dialogMode === 'create'
                  ? 'Agregar producto'
                  : 'Modificar producto'}
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={closeDialog}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">SKU</div>
                  <input
                    value={draft.sku}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        sku: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="SKU-004"
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">
                    Precio
                  </div>
                  <input
                    value={draft.precio}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        precio: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="0"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    step={1}
                    required
                  />
                </label>
              </div>

              <label className="space-y-1">
                <div className="text-xs font-medium text-slate-700">
                  ID de inventario
                </div>
                <input
                  value={draft.inventarioId}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inventarioId: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="INV-004"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="space-y-1">
                <div className="text-xs font-medium text-slate-700">
                  Producto
                </div>
                <input
                  value={draft.producto}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      producto: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Nombre del producto"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="space-y-1">
                <div className="text-xs font-medium text-slate-700">
                  Foto (URL)
                </div>
                <input
                  value={draft.foto}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      foto: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="https://..."
                  autoComplete="off"
                  type="url"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">
                    Stock
                  </div>
                  <input
                    value={draft.stock}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        stock: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="0"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    step={1}
                    required
                  />
                </label>
                <label className="space-y-1">
                  <div className="text-xs font-medium text-slate-700">
                    Mínimo
                  </div>
                  <input
                    value={draft.minimo}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        minimo: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="0"
                    inputMode="numeric"
                    type="number"
                    min={0}
                    step={1}
                    required
                  />
                </label>
              </div>

              {formError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {formError}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {dialogMode === 'create' ? 'Agregar' : 'Guardar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
