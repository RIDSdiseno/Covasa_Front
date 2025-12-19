const rows = [
  { vendedor: 'Juan Pérez', total: 6450000, cobradas: 6020000 },
  { vendedor: 'María López', total: 5120000, cobradas: 4780000 },
  { vendedor: 'Pedro Soto', total: 3980000, cobradas: 3520000 },
]

export default function VentasPorVendedorPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Resumen por vendedor (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Vendedor</th>
              <th className="px-3 py-2">Ventas</th>
              <th className="px-3 py-2">Cobradas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.vendedor} className="bg-white">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.vendedor}
                </td>
                <td className="px-3 py-2">
                  {row.total.toLocaleString('es-CL')}
                </td>
                <td className="px-3 py-2">
                  {row.cobradas.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
