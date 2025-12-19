const rows = [
  { fecha: '2024-12-16', ventas: 3450000, pagado: 2900000, debe: 550000 },
  { fecha: '2024-12-15', ventas: 5120000, pagado: 4200000, debe: 920000 },
  { fecha: '2024-12-14', ventas: 2980000, pagado: 2760000, debe: 220000 },
]

export default function VentasDiariasPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Reporte de ventas diarias</div>
          <input
            type="date"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
            defaultValue={rows[0]?.fecha}
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Ventas</th>
                <th className="px-3 py-2">Pagado</th>
                <th className="px-3 py-2">Por cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.fecha} className="bg-white">
                  <td className="px-3 py-2">{row.fecha}</td>
                  <td className="px-3 py-2">
                    {row.ventas.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">
                    {row.pagado.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">
                    {row.debe.toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
        Próximo: cuadración de venta y crédito + exportación.
      </div>
    </div>
  )
}
