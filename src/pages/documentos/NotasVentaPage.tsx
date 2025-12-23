const rows = [
  { id: 'NV-1042', cliente: 'ACME Ltda.', total: 890000, despacho: 'Las Condes' },
  {
    id: 'NV-1041',
    cliente: 'Ferretería Norte',
    total: 420000,
    despacho: 'Maipú',
  },
  {
    id: 'NV-1040',
    cliente: 'Distribuidora Sur',
    total: 1320000,
    despacho: 'Rancagua',
  },
]

export default function NotasVentaPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Notas de venta (demo)</div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            Nueva nota
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Despacho</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row) => (
                <tr key={row.id} className="bg-[var(--surface)]">
                  <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
                    {row.id}
                  </td>
                  <td className="px-3 py-2">{row.cliente}</td>
                  <td className="px-3 py-2">{row.despacho}</td>
                  <td className="px-3 py-2">
                    {row.total.toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-primary)] shadow-sm">
        Próximo: ruta para despacho, dirección de despacho y estado de entrega.
      </div>
    </div>
  )
}



