const rows = [
  { mes: 'Octubre', total: 18200000 },
  { mes: 'Noviembre', total: 19500000 },
  { mes: 'Diciembre', total: 20650000 },
]

export default function VentasMensualPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Resumen mensual (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.mes} className="bg-white">
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
