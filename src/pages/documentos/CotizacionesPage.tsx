import { FileText, GripVertical, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useState, type DragEvent } from 'react'
import Button from '../../components/ui/Button'
import { cn } from '../../lib/cn'

type CotizacionStatus = 'pendiente' | 'en_proceso' | 'realizada'

type DocumentoAdjunto = {
  name: string
  type: string
  size: number
  uploadedAt: string
  file?: File
}

type Cotizacion = {
  id: string
  cliente: string
  total: number
  creadaEl: string
  status: CotizacionStatus
  documento?: DocumentoAdjunto
}

type StoredCotizacion = Omit<Cotizacion, 'documento'> & {
  documento?: Omit<DocumentoAdjunto, 'file'>
}

type FinalizeDialogState = {
  cotizacionId: string
  file: File | null
  error: string | null
} | null

const columns: Array<{
  key: CotizacionStatus
  label: string
  helper: string
}> = [
  { key: 'pendiente', label: 'Cotizaciones', helper: 'Por iniciar' },
  { key: 'en_proceso', label: 'Nota de ventas', helper: 'Cotización finalizada' },
  { key: 'realizada', label: 'Para facturar', helper: 'Lista para facturar' },
]

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const initialCotizaciones: Cotizacion[] = [
  {
    id: createId(),
    cliente: 'ACME Ltda.',
    total: 890000,
    creadaEl: '2025-12-16',
    status: 'pendiente',
  },
  {
    id: createId(),
    cliente: 'Ferretería Norte',
    total: 420000,
    creadaEl: '2025-12-15',
    status: 'en_proceso',
  },
  {
    id: createId(),
    cliente: 'Distribuidora Sur',
    total: 1320000,
    creadaEl: '2025-12-14',
    status: 'pendiente',
  },
]

const STORAGE_KEY = 'covasa.cotizaciones'
const validStatuses: CotizacionStatus[] = ['pendiente', 'en_proceso', 'realizada']

function loadCotizaciones(): Cotizacion[] {
  if (typeof window === 'undefined') return initialCotizaciones
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return initialCotizaciones
    const parsed = JSON.parse(stored) as StoredCotizacion[]
    if (!Array.isArray(parsed)) return initialCotizaciones

    const sanitized = parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const { id, cliente, total, creadaEl, status, documento } =
        item as Partial<StoredCotizacion>
      if (
        typeof id !== 'string' ||
        typeof cliente !== 'string' ||
        typeof total !== 'number' ||
        typeof creadaEl !== 'string' ||
        typeof status !== 'string' ||
        !validStatuses.includes(status as CotizacionStatus)
      ) {
        return []
      }

      const cotizacion: Cotizacion = {
        id,
        cliente,
        total,
        creadaEl,
        status: status as CotizacionStatus,
      }

      if (documento && typeof documento === 'object') {
        const { name, type, size, uploadedAt } =
          documento as Partial<DocumentoAdjunto>
        if (typeof name === 'string' && typeof size === 'number') {
          cotizacion.documento = {
            name,
            type: typeof type === 'string' ? type : '',
            size,
            uploadedAt:
              typeof uploadedAt === 'string' ? uploadedAt : new Date().toISOString(),
          }
        }
      }

      return [cotizacion]
    })

    return sanitized.length ? sanitized : initialCotizaciones
  } catch {
    return initialCotizaciones
  }
}

function serializeCotizaciones(cotizaciones: Cotizacion[]): StoredCotizacion[] {
  return cotizaciones.map(({ documento, ...rest }) => ({
    ...rest,
    documento: documento
      ? {
          name: documento.name,
          type: documento.type,
          size: documento.size,
          uploadedAt: documento.uploadedAt,
        }
      : undefined,
  }))
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / 1024 ** exponent
  const decimals = value >= 10 || exponent === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[exponent]}`
}

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] =
    useState<Cotizacion[]>(() => loadCotizaciones())
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<CotizacionStatus | null>(null)
  const [finalizeDialog, setFinalizeDialog] = useState<FinalizeDialogState>(
    null,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(serializeCotizaciones(cotizaciones)),
      )
    } catch {
      // Ignore storage errors.
    }
  }, [cotizaciones])

  const money = useMemo(
    () =>
      new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        maximumFractionDigits: 0,
      }),
    [],
  )

  const cotizacionToFinalize = finalizeDialog
    ? cotizaciones.find((cotizacion) => cotizacion.id === finalizeDialog.cotizacionId) ??
      null
    : null

  function addCotizacion() {
    const nueva: Cotizacion = {
      id: createId(),
      cliente: 'Nuevo cliente',
      total: 0,
      creadaEl: new Date().toISOString().slice(0, 10),
      status: 'pendiente',
    }
    setCotizaciones((current) => [nueva, ...current])
  }

  function moveCotizacion(cotizacionId: string, status: CotizacionStatus) {
    setCotizaciones((current) =>
      current.map((cotizacion) =>
        cotizacion.id === cotizacionId ? { ...cotizacion, status } : cotizacion,
      ),
    )
  }

  function openFinalizeDialog(cotizacionId: string) {
    setDraggingId(null)
    setDropTarget(null)
    setFinalizeDialog({ cotizacionId, file: null, error: null })
  }

  function closeFinalizeDialog() {
    setFinalizeDialog(null)
  }

  function handleConfirmFinalize() {
    if (!finalizeDialog) return
    if (!finalizeDialog.file) {
      setFinalizeDialog((current) =>
        current
          ? {
              ...current,
              error: 'Debes subir un documento (Excel, Word o imagen).',
            }
          : current,
      )
      return
    }

    const file = finalizeDialog.file
    const documento: DocumentoAdjunto = {
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      file,
    }

    setCotizaciones((current) =>
      current.map((cotizacion) =>
        cotizacion.id === finalizeDialog.cotizacionId
          ? { ...cotizacion, status: 'realizada', documento }
          : cotizacion,
      ),
    )
    setFinalizeDialog(null)
  }

  function handleDrop(status: CotizacionStatus, cotizacionId: string) {
    if (status === 'realizada') {
      const cotizacion = cotizaciones.find((item) => item.id === cotizacionId)
      if (cotizacion?.documento) {
        moveCotizacion(cotizacionId, 'realizada')
        return
      }
      openFinalizeDialog(cotizacionId)
      return
    }

    moveCotizacion(cotizacionId, status)
  }

  function handleDropOnColumn(
    status: CotizacionStatus,
    event: DragEvent<HTMLDivElement>,
  ) {
    event.preventDefault()
    setDropTarget(null)
    const cotizacionId = event.dataTransfer.getData('text/plain') || draggingId
    if (!cotizacionId) return
    handleDrop(status, cotizacionId)
  }

  function handleDragStart(
    cotizacionId: string,
    event: DragEvent<HTMLDivElement>,
  ) {
    setDraggingId(cotizacionId)
    event.dataTransfer.setData('text/plain', cotizacionId)
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDropTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Cotizaciones</div>
            <div className="mt-1 text-xs text-slate-600">
              Arrastra tarjetas entre columnas para cambiar el estado. Para
              pasar a facturar, debes subir un documento.
            </div>
          </div>
          <Button variant="secondary" onClick={addCotizacion} className="px-3">
            Nueva cotización
          </Button>
        </div>
      </div>

      <div className="grid grid-flow-col auto-cols-[minmax(18rem,1fr)] gap-4 overflow-x-auto pb-2">
        {columns.map((column) => {
          const items = cotizaciones.filter(
            (cotizacion) => cotizacion.status === column.key,
          )
          const highlighted = dropTarget === column.key

          return (
            <div
              key={column.key}
              className={cn(
                'rounded-2xl border border-slate-200 bg-slate-50 p-3',
                highlighted ? 'ring-2 ring-slate-300' : null,
              )}
              onDragOver={(event) => {
                event.preventDefault()
                if (dropTarget !== column.key) setDropTarget(column.key)
              }}
              onDrop={(event) => handleDropOnColumn(column.key, event)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {column.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {column.helper}
                  </div>
                </div>
                <div className="rounded-xl bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                  {items.length}
                </div>
              </div>

              <div className="mt-3 space-y-3">
                {items.length ? (
                  items.map((cotizacion) => (
                    <div
                      key={cotizacion.id}
                      draggable
                      onDragStart={(event) =>
                        handleDragStart(cotizacion.id, event)
                      }
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm',
                        draggingId === cotizacion.id
                          ? 'opacity-60'
                          : 'hover:border-slate-300',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 text-slate-400">
                              <GripVertical
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-slate-900">
                                {cotizacion.cliente}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                <span className="font-medium text-slate-700">
                                  {cotizacion.id.slice(0, 8).toUpperCase()}
                                </span>
                                <span>{cotizacion.creadaEl}</span>
                                <span>{money.format(cotizacion.total)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {cotizacion.documento ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText
                              className="h-4 w-4 text-slate-500"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              {cotizacion.documento.name}
                            </span>
                          </div>
                          <div className="shrink-0 text-slate-500">
                            {formatFileSize(cotizacion.documento.size)}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-xs text-slate-600">
                    Suelta aquí una cotización.
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {finalizeDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/40"
            onClick={closeFinalizeDialog}
            aria-label="Cerrar"
          />

          <div className="relative w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Pasar a facturar</div>
              <Button
                variant="secondary"
                size="icon"
                onClick={closeFinalizeDialog}
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="mt-2 text-sm text-slate-700">
              Para mover la cotización a{' '}
              <span className="font-semibold">Para facturar</span>, sube un
              documento (Excel, Word o imagen).
            </div>

            {cotizacionToFinalize ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-medium text-slate-600">
                  Cotización
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {cotizacionToFinalize.cliente}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">
                    {cotizacionToFinalize.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span>{cotizacionToFinalize.creadaEl}</span>
                  <span>{money.format(cotizacionToFinalize.total)}</span>
                </div>
              </div>
            ) : null}

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-700 hover:bg-slate-100">
              <Upload className="h-5 w-5 text-slate-600" aria-hidden="true" />
              <div className="mt-2 font-semibold">Seleccionar archivo</div>
              <div className="mt-1 text-xs text-slate-500">
                XLS/XLSX, DOC/DOCX o imágenes
              </div>
              <input
                className="sr-only"
                type="file"
                accept=".xls,.xlsx,.doc,.docx,image/*,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null
                  setFinalizeDialog((current) =>
                    current ? { ...current, file, error: null } : current,
                  )
                }}
              />
            </label>

            {finalizeDialog.file ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{finalizeDialog.file.name}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatFileSize(finalizeDialog.file.size)}
                  </span>
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
              <Button
                onClick={handleConfirmFinalize}
                disabled={!finalizeDialog.file}
              >
                Enviar a facturar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
