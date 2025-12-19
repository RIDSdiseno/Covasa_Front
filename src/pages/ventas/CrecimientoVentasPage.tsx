const rows = [
  { mes: 'Octubre', ventas: 18200000, variacion: '+4.2%' },
  { mes: 'Noviembre', ventas: 19500000, variacion: '+7.1%' },
  { mes: 'Diciembre', ventas: 20650000, variacion: '+5.9%' },
]

export default function CrecimientoVentasPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">Crecimiento mes a mes (demo)</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-600">
            <tr>
              <th className="px-3 py-2">Mes</th>
              <th className="px-3 py-2">Ventas</th>
              <th className="px-3 py-2">Variación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => (
              <tr key={row.mes} className="bg-white">
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
