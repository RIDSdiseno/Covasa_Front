import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: 'cartera', label: 'Cartera' },
  { to: 'pagos', label: 'Pagos' },
  { to: 'creditos', label: 'Crédito' },
]

export default function CobranzaLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cobranza</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Revisión de cartera, asignación de crédito y seguimiento de pagos.
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



