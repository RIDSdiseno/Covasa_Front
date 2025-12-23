import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const tabs = [
  { to: 'cotizaciones', label: 'Cotizaciones' },
  { to: 'notas-venta', label: 'Nota de ventas' },
  { to: 'facturas', label: 'Facturas' },
]

export default function DocumentosLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documentos</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Cotizaciones, nota de ventas y facturas.
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



