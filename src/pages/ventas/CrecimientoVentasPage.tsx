const rows = [
  { mes: 'Octubre', ventas: 18200000, variacion: '+4.2%' },
  { mes: 'Noviembre', ventas: 19500000, variacion: '+7.1%' },
  { mes: 'Diciembre', ventas: 20650000, variacion: '+5.9%' },
]

export default function CrecimientoVentasPage() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold">Crecimiento mes a mes (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">Ventas</th>
              <th className="px-3 py-2">Variación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.mes} className="bg-[var(--surface)]">
                <td className="px-3 py-2">{row.mes}</td>
                <td className="px-3 py-2">
                  {row.ventas.toLocaleString('es-CL')}
                </td>
                <td className="px-3 py-2">{row.variacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



