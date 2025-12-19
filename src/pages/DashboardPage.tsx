import { ArrowUpRight, Boxes, HandCoins, ShoppingCart } from 'lucide-react'
import { Link } from 'react-router-dom'

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string
  value: string
  helper: string
  icon: typeof ShoppingCart
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-600">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">
            {value}
          </div>
          <div className="mt-1 text-xs text-slate-500">{helper}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Resumen rápido de ventas, cobranza e inventario (demo con datos
            ficticios).
          </p>
        </div>
        <Link
          to="/ventas"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
        >
          Ver reportes
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value="$ 3.450.000"
          helper="Pagado: $ 2.900.000 · Por cobrar: $ 550.000"
          icon={ShoppingCart}
        />
        <StatCard
          label="Cobranza pendiente"
          value="$ 8.120.000"
          helper="12 clientes con saldo"
          icon={HandCoins}
        />
        <StatCard
          label="Stock bajo"
          value="7 productos"
          helper="Revisar inventario y alertas"
          icon={Boxes}
        />
        <StatCard
          label="Notas de venta"
          value="18"
          helper="Emitidas en los últimos 7 días"
          icon={ShoppingCart}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Tareas recomendadas</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span>Confirmar órdenes de compra recibidas por correo</span>
              <span className="text-xs font-medium text-slate-500">
                Documentos
              </span>
            </li>
            <li className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span>Registrar comprobantes de pago con foto</span>
              <span className="text-xs font-medium text-slate-500">Pagos</span>
            </li>
            <li className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span>Revisar cartera y asignación de crédito</span>
              <span className="text-xs font-medium text-slate-500">
                Cobranza
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold">Últimos movimientos</div>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Detalle</th>
                  <th className="px-3 py-2 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-white">
                  <td className="px-3 py-2">Pago</td>
                  <td className="px-3 py-2">Transferencia · Cliente ACME</td>
                  <td className="px-3 py-2">$ 420.000</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-3 py-2">Venta</td>
                  <td className="px-3 py-2">Nota de venta #NV-1042</td>
                  <td className="px-3 py-2">$ 890.000</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-3 py-2">Inventario</td>
                  <td className="px-3 py-2">Salida · Producto “X”</td>
                  <td className="px-3 py-2">-12 u.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
