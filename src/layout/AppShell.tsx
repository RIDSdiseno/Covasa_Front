import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Boxes,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/auth'
import Button from '../components/ui/Button'
import { cn } from '../lib/cn'

type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[]
  onNavigate?: () => void
}) {
  return (
    <nav className="space-y-1.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'bg-[var(--sidebar-soft)] text-[var(--sidebar-primary)] hover:text-[var(--sidebar-primary-hover)] before:absolute before:left-2 before:top-1/2 before:h-6 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-[var(--sidebar-primary)]'
                : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  isActive
                    ? 'text-[var(--sidebar-primary)] group-hover:text-[var(--sidebar-primary-hover)]'
                    : 'text-[var(--sidebar-muted)] group-hover:text-[var(--sidebar-text)]',
                )}
                aria-hidden="true"
              />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = useMemo<NavItem[]>(
    () => [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
      { to: '/cobranza', label: 'Cobranza', icon: HandCoins },
      { to: '/inventario', label: 'Inventario', icon: Boxes },
      { to: '/documentos', label: 'Documentos', icon: FileText },
      { to: '/conciliacion', label: 'Conciliación', icon: Banknote },
      { to: '/pagos', label: 'Pagos', icon: CreditCard },
      { to: '/configuracion', label: 'Configuración', icon: Settings },
    ],
    [],
  )
  const mobileNavItems = navItems.filter((item) =>
    ['/dashboard', '/ventas', '/cobranza', '/inventario', '/documentos'].includes(
      item.to,
    ),
  )

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex w-full">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 text-[var(--sidebar-text)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-soft)] px-3.5 py-3 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--sidebar-border)] bg-white shadow-sm">
              <img
                src="/img/logo.png"
                alt="COVASA"
                className="h-8 w-10 object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight text-[var(--sidebar-text)]">
                COVASA
              </div>
              <div className="truncate text-xs text-[var(--sidebar-muted)]">
                Gestión de cobranza y ventas
              </div>
            </div>
          </div>

          <div className="mt-6 flex-1">
            <SidebarNav items={navItems} />
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--sidebar-border)] bg-white p-3.5 text-xs">
            <div className="font-medium text-[var(--sidebar-text)]">Contacto</div>
            <div className="mt-1 break-all text-[var(--sidebar-muted)]">
              xlazo@covasachile.cl
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  COVASA — Sistema de gestión
                </div>
                <div className="truncate text-xs text-slate-600">
                  Ventas, cobranza, inventario y conciliación
                </div>
              </div>

              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden max-w-[14rem] truncate text-xs text-slate-600 sm:block">
                    {user.email}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      logout()
                      setMobileOpen(false)
                      navigate('/login', { replace: true })
                    }}
                    className="px-3"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Cerrar sesión</span>
                  </Button>
                </div>
              ) : null}
            </div>
          </header>

          {mobileOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/40"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              />
              <div className="absolute left-0 top-0 h-full w-full max-w-[22rem] overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 pb-6 text-[var(--sidebar-text)] shadow-xl sm:w-[min(20rem,85vw)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Menú</div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:bg-slate-50"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4">
                  <SidebarNav
                    items={navItems}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
            <Outlet />
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white lg:hidden">
            <div className="mx-auto flex max-w-[32rem] items-center justify-around px-2 py-2">
              {mobileNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--sidebar-muted)]',
                      isActive
                        ? 'text-[var(--sidebar-primary)]'
                        : 'hover:text-[var(--sidebar-text)]',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-[4.5rem] truncate text-center leading-none">
                    {item.label}
                  </span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
