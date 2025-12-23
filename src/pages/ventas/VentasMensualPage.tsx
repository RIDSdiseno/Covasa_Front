const rows = [
  { mes: 'Octubre', total: 18200000 },
  { mes: 'Noviembre', total: 19500000 },
  { mes: 'Diciembre', total: 20650000 },
]

export default function VentasMensualPage() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold">Resumen mensual (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.mes} className="bg-[var(--surface)]">
                <td className="px-3 py-2">{row.mes}</td>
                <td className="px-3 py-2">
                  {row.total.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



