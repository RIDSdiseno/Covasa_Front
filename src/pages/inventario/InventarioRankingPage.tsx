const rows = [
  { producto: 'Producto X', vendido: 120, stock: 24 },
  { producto: 'Producto Y', vendido: 95, stock: 12 },
  { producto: 'Producto Z', vendido: 72, stock: 5 },
]

export default function InventarioRankingPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Ranking bodega (demo)</div>
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Más vendido</th>
              <th className="px-3 py-2">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.producto} className="bg-white">
                <td className="px-3 py-2 font-medium text-slate-900">
                  {row.producto}
                </td>
                <td className="px-3 py-2">{row.vendido}</td>
                <td className="px-3 py-2">{row.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
