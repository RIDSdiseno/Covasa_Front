const rows = [
  { cliente: 'Ferretería Norte', debe: 1250000, vence: '2025-01-05' },
  { cliente: 'ACME Ltda.', debe: 840000, vence: '2024-12-28' },
  { cliente: 'Distribuidora Sur', debe: 1930000, vence: '2025-01-12' },
]

export default function CarteraPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Cartera (demo)</div>
          <input
            className="h-10 w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none ring-slate-300 focus:ring-2"
            placeholder="Buscar cliente..."
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium text-slate-600">
              <tr>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Saldo</th>
                <th className="px-3 py-2">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row) => (
                <tr key={row.cliente} className="bg-white">
                  <td className="px-3 py-2">{row.cliente}</td>
                  <td className="px-3 py-2">
                    {row.debe.toLocaleString('es-CL')}
                  </td>
                  <td className="px-3 py-2">{row.vence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
