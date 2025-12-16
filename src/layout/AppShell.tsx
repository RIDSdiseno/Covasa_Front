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
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
            )
          }
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-[1440px]">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-3 py-3 text-white">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-sm font-semibold">
              C
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold leading-tight">
                COVASA
              </div>
              <div className="truncate text-xs text-white/80">
                Gestión de cobranza y ventas
              </div>
            </div>
          </div>

          <div className="mt-6 flex-1">
            <SidebarNav items={navItems} />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-medium text-slate-900">Contacto</div>
            <div className="mt-1 break-all">xlazo@covasachile.cl</div>
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
              <div className="absolute left-0 top-0 h-full w-[min(20rem,85vw)] bg-white p-4 shadow-xl">
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

          <main className="flex-1 p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
