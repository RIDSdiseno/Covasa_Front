import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: 'diarias', label: 'Diarias' },
  { to: 'por-vendedor', label: 'Por vendedor' },
  { to: 'mensual', label: 'Mensual' },
  { to: 'crecimiento', label: 'Crecimiento' },
]

export default function VentasLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Reportes diarios, resumen mensual y por vendedor.
        </p>
      </div>

      <div className="border-b border-[var(--border)]">
        <nav className="-mb-px flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'rounded-t-xl border border-transparent px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'border-[var(--border)] border-b-[var(--surface)] bg-[var(--surface)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
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



