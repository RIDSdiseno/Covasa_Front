import { useMemo, useState } from 'react'

type PaymentMethod = 'CHEQUE' | 'TRANSFERENCIA' | 'TC' | 'LINK_PAGO'

type PaymentDraft = {
  cliente: string
  monto: string
  metodo: PaymentMethod
  fecha: string
  referencia: string
  archivo?: File
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  CHEQUE: 'Cheque',
  TRANSFERENCIA: 'Transferencia',
  TC: 'Tarjeta (TC)',
  LINK_PAGO: 'Link de pago',
}

export default function PagosPage() {
  const [draft, setDraft] = useState<PaymentDraft>({
    cliente: '',
    monto: '',
    metodo: 'TRANSFERENCIA',
    fecha: new Date().toISOString().slice(0, 10),
    referencia: '',
  })

  const previewUrl = useMemo(
    () => (draft.archivo ? URL.createObjectURL(draft.archivo) : undefined),
    [draft.archivo],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pagos</h1>
        <p className="mt-1 text-sm text-slate-600">
          Registro de pagos (con carga de foto) y confirmación.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Ingreso de pago</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Cliente</span>
              <input
                value={draft.cliente}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    cliente: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Ej: Ferretería Norte"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Monto</span>
              <input
                value={draft.monto}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    monto: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Ej: 420000"
                inputMode="numeric"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Método</span>
              <select
                value={draft.metodo}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    metodo: event.target.value as PaymentMethod,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-slate-600">Fecha</span>
              <input
                type="date"
                value={draft.fecha}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    fecha: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">
                Referencia / N° comprobante
              </span>
              <input
                value={draft.referencia}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    referencia: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Ej: TRX-12345"
              />
            </label>

            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-slate-600">
                Foto del pago (opcional)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    archivo: event.target.files?.[0] ?? undefined,
                  }))
                }
                className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Guardar (demo)
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  cliente: '',
                  monto: '',
                  metodo: 'TRANSFERENCIA',
                  fecha: new Date().toISOString().slice(0, 10),
                  referencia: '',
                })
              }
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Limpiar
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Vista previa</div>
          <div className="mt-3 text-sm text-slate-700">
            <div className="grid gap-2">
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Cliente:{' '}
                </span>
                {draft.cliente || '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Monto:{' '}
                </span>
                {draft.monto ? `$ ${draft.monto}` : '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Método:{' '}
                </span>
                {paymentMethodLabels[draft.metodo]}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Fecha:{' '}
                </span>
                {draft.fecha || '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Referencia:{' '}
                </span>
                {draft.referencia || '—'}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Vista previa del comprobante"
                  className="h-64 w-full object-contain"
                />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-slate-500">
                  Sin imagen cargada
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
