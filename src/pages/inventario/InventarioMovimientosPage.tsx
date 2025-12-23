const rows = [
  { fecha: '2024-12-15', tipo: 'Salida', producto: 'Producto X', cantidad: -12 },
  {
    fecha: '2024-12-14',
    tipo: 'Entrada',
    producto: 'Producto Y',
    cantidad: 48,
  },
  {
    fecha: '2024-12-13',
    tipo: 'Salida',
    producto: 'Producto Z',
    cantidad: -6,
  },
]

export default function InventarioMovimientosPage() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="text-sm font-semibold">Movimientos (demo)</div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Producto</th>
              <th className="px-3 py-2">Cantidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={`${row.fecha}-${row.producto}`} className="bg-[var(--surface)]">
                <td className="px-3 py-2">{row.fecha}</td>
                <td className="px-3 py-2">{row.tipo}</td>
                <td className="px-3 py-2">{row.producto}</td>
                <td className="px-3 py-2">{row.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}



