const rows = [
  { producto: 'Producto X', vendido: 120, stock: 24 },
  { producto: 'Producto Y', vendido: 95, stock: 12 },
  { producto: 'Producto Z', vendido: 72, stock: 5 },
]

export default function InventarioRankingPage() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold">Ranking bodega (demo)</div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Más vendido</th>
              <th className="px-3 py-2">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.producto} className="bg-[var(--surface)]">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
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



