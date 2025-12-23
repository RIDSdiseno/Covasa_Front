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
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Registro de pagos (con carga de foto) y confirmación.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="text-sm font-semibold">Ingreso de pago</div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Cliente</span>
              <input
                value={draft.cliente}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    cliente: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: Ferretería Norte"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Monto</span>
              <input
                value={draft.monto}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    monto: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: 420000"
                inputMode="numeric"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Método</span>
              <select
                value={draft.metodo}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    metodo: event.target.value as PaymentMethod,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
              >
                {Object.entries(paymentMethodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Fecha</span>
              <input
                type="date"
                value={draft.fecha}
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    fecha: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
              />
            </label>

            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
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
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none ring-primary focus:ring-2"
                placeholder="Ej: TRX-12345"
              />
            </label>

            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
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
                className="block w-full text-sm text-[var(--text-primary)] file:mr-3 file:rounded-xl file:border file:border-[var(--border)] file:bg-[var(--primary-soft)] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--primary)] hover:file:bg-[var(--hover)]"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-2 text-sm font-medium text-[var(--primary)] hover:bg-[var(--hover)]"
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
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
            >
              Limpiar
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="text-sm font-semibold">Vista previa</div>
          <div className="mt-3 text-sm text-[var(--text-primary)]">
            <div className="grid gap-2">
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Cliente:{' '}
                </span>
                {draft.cliente || '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Monto:{' '}
                </span>
                {draft.monto ? `$ ${draft.monto}` : '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Método:{' '}
                </span>
                {paymentMethodLabels[draft.metodo]}
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Fecha:{' '}
                </span>
                {draft.fecha || '—'}
              </div>
              <div>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Referencia:{' '}
                </span>
                {draft.referencia || '—'}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--hover)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Vista previa del comprobante"
                  className="h-64 w-full object-contain"
                />
              ) : (
                <div className="grid h-64 place-items-center text-sm text-[var(--text-secondary)]">
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



