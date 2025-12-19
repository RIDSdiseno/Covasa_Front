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
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Notas de venta (demo)</div>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Nueva nota
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Despacho</th>
                <th className="px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.id} className="bg-white">
                  <td className="px-3 py-2 font-medium text-slate-900">
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
        Próximo: ruta para despacho, dirección de despacho y estado de entrega.
      </div>
    </div>
  )
}
