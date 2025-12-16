import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: 'stock', label: 'Stock' },
  { to: 'movimientos', label: 'Movimientos' },
  { to: 'ranking', label: 'Ranking' },
]

export default function InventarioLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventario</h1>
        <p className="mt-1 text-sm text-slate-600">
          Control de stock, ranking de bodega y notificaciones.
        </p>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'rounded-t-xl border border-transparent px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'border-slate-200 border-b-white bg-white text-slate-900'
                    : 'text-slate-600 hover:text-slate-900',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
