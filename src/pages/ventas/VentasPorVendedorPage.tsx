const rows = [
  { vendedor: 'Juan Pérez', total: 6450000, cobradas: 6020000 },
  { vendedor: 'María López', total: 5120000, cobradas: 4780000 },
  { vendedor: 'Pedro Soto', total: 3980000, cobradas: 3520000 },
]

export default function VentasPorVendedorPage() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold">Resumen por vendedor (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Vendedor</th>
              <th className="px-3 py-2">Ventas</th>
              <th className="px-3 py-2">Cobradas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.vendedor} className="bg-[var(--surface)]">
                <td className="px-3 py-2 font-medium text-[var(--text-primary)]">
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



