// AppShell.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  Bell,
  Boxes,
  CreditCard,
  FileText,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShoppingCart,
  UserCog,
  Users,
  X,
  Truck,
  Check,
  RefreshCcw,
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

/** =========================
 *  Backend shapes (stock alerts)
 *  ========================= */
type ApiProducto = {
  id: string
  sku: string | null
  nombre: string
}

type ApiInventario = {
  id: string
  productoId: string
  stock: number
  minimo: number
  updatedAt?: string
  producto?: ApiProducto
}

type ApiStockAlert = {
  id: string
  inventarioId: string
  threshold: number
  stockAtAlert: number
  status: 'OPEN' | 'ACK' | 'RESOLVED'
  openedAt: string
  lastSentAt?: string | null
  inventario?: ApiInventario
}

type ApiCount = { status: string; count: number }

/** =========================
 *  UI shape
 *  ========================= */
type StockAlertUI = {
  alertId: string
  inventarioId: string
  productoId: string
  sku?: string | null
  nombre: string
  stock: number
  stockMinimo: number
  openedAt?: string
  updatedAt?: string
}

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3000'

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

  // 🔔 Notificaciones
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement | null>(null)

  const [alerts, setAlerts] = useState<StockAlertUI[]>([])
  const [alertsCount, setAlertsCount] = useState(0)

  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [loadingCount, setLoadingCount] = useState(false)

  function getAuthToken() {
    return (
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('auth_token') ||
      sessionStorage.getItem('auth_token') ||
      ''
    )
  }

  function buildHeaders(extra?: Record<string, string>): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extra ?? {}),
    }
    const t = getAuthToken()
    if (t) h.Authorization = `Bearer ${t}`
    return h
  }

  // ✅ Tolerante: si backend no incluye producto, igual renderiza
  function mapAlert(a: ApiStockAlert): StockAlertUI {
    const inv = a.inventario
    const prod = inv?.producto

    const nombre = prod?.nombre ?? '(Producto)'
    const sku = prod?.sku ?? null

    const inventarioId = inv?.id ?? a.inventarioId
    const productoId = inv?.productoId ?? ''

    const stock = typeof inv?.stock === 'number' ? inv.stock : a.stockAtAlert
    const stockMinimo = typeof inv?.minimo === 'number' ? inv.minimo : a.threshold

    return {
      alertId: a.id,
      inventarioId,
      productoId,
      sku,
      nombre,
      stock,
      stockMinimo,
      openedAt: a.openedAt,
      updatedAt: inv?.updatedAt,
    }
  }

  async function fetchStockAlerts(): Promise<StockAlertUI[]> {
    const url = `${API_BASE_URL}/stock-alerts?status=OPEN`
    const resp = await fetch(url, { headers: buildHeaders() })
    if (!resp.ok) throw new Error(`No se pudo cargar alertas (${resp.status})`)
    const data: ApiStockAlert[] = await resp.json()
    return data.map(mapAlert)
  }

  async function fetchCount(): Promise<number> {
    // si no existe este endpoint en tu backend, caerá al catch y usamos alerts.length
    const url = `${API_BASE_URL}/stock-alerts/count?status=OPEN`
    const resp = await fetch(url, { headers: buildHeaders() })
    if (!resp.ok) throw new Error(`No se pudo cargar count (${resp.status})`)
    const data: ApiCount = await resp.json()
    return Number(data.count || 0)
  }

  async function refreshAlerts() {
    try {
      setLoadingAlerts(true)
      const data = await fetchStockAlerts()
      setAlerts(data)
      setAlertsCount(data.length)
    } catch (e) {
      console.error('refreshAlerts error:', e)
      // ✅ no borres lo que ya había
    } finally {
      setLoadingAlerts(false)
    }
  }

  async function refreshCount() {
    try {
      setLoadingCount(true)
      const c = await fetchCount()
      setAlertsCount(c)
    } catch (e) {
      // fallback: badge desde estado local
      setAlertsCount((prev) => (prev > 0 ? prev : alerts.length))
    } finally {
      setLoadingCount(false)
    }
  }

  async function ackAlert(alertId: string) {
    try {
      const resp = await fetch(
        `${API_BASE_URL}/stock-alerts/${encodeURIComponent(alertId)}/ack`,
        {
          method: 'POST',
          headers: buildHeaders(),
        },
      )

      if (!resp.ok) {
        console.error('ackAlert failed', resp.status)
        return
      }

      // optimista: sácalo del listado (OPEN)
      setAlerts((prev) => prev.filter((a) => a.alertId !== alertId))
      setAlertsCount((c) => Math.max(0, c - 1))
    } catch (e) {
      console.error('ack alert error:', e)
    }
  }

  // Debug útil: confirma a qué backend estás pegando
  useEffect(() => {
    console.log('[StockAlerts] API_BASE_URL =', API_BASE_URL)
  }, [])

  // Polling: refresh count cada 30s, y alertas completas cada 60s (liviano)
  useEffect(() => {
    let alive = true

    const runCount = async () => {
      if (!alive) return
      await refreshCount()
    }

    const runAlerts = async () => {
      if (!alive) return
      try {
        const data = await fetchStockAlerts()
        if (alive) {
          setAlerts(data)
          setAlertsCount(data.length)
        }
      } catch (e) {
        console.error('poll fetchStockAlerts error:', e)
        // no rompas UI
      }
    }

    // primera carga
    runCount()
    runAlerts()

    const idCount = window.setInterval(runCount, 30_000)
    const idAlerts = window.setInterval(runAlerts, 60_000)

    return () => {
      alive = false
      window.clearInterval(idCount)
      window.clearInterval(idAlerts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Al abrir el dropdown: refresca alertas al tiro (esto arregla "no veo nada")
  useEffect(() => {
    if (!notifOpen) return
    refreshAlerts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen])

  // cerrar dropdown al click fuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!notifRef.current) return
      if (!notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    if (notifOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [notifOpen])

  const navItems = useMemo<NavItem[]>(
    () => [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart },
      { to: '/cobranza', label: 'Cobranza', icon: HandCoins },
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/trabajadores', label: 'Trabajadores', icon: UserCog },
      { to: '/inventario', label: 'Inventario', icon: Boxes },
      { to: '/fletes', label: 'Fletes', icon: Truck },
      { to: '/documentos', label: 'Documentos', icon: FileText },
      { to: '/conciliacion', label: 'Conciliación', icon: Banknote },
      { to: '/pagos', label: 'Pagos', icon: CreditCard },
      { to: '/configuracion', label: 'Configuración', icon: Settings },
    ],
    [],
  )

  const mobileNavItems = navItems.filter((item) =>
    ['/dashboard', '/ventas', '/cobranza', '/inventario', '/fletes', '/documentos'].includes(item.to),
  )

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div className="flex w-full">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 text-[var(--sidebar-text)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-soft)] px-3.5 py-3 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--sidebar-border)] bg-[var(--surface)] shadow-sm">
              <img src="/img/logo.png" alt="COVASA" className="h-8 w-10 object-contain" />
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

          <div className="mt-6 rounded-2xl border border-[var(--sidebar-border)] bg-[var(--surface)] p-3.5 text-xs">
            <div className="font-medium text-[var(--sidebar-text)]">Contacto</div>
            <div className="mt-1 break-all text-[var(--sidebar-muted)]">xlazo@covasachile.cl</div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface-80)] backdrop-blur">
            <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--hover)] lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">COVASA — Sistema de gestión</div>
                <div className="truncate text-xs text-[var(--text-secondary)]">
                  Ventas, cobranza, inventario y conciliación
                </div>
              </div>

              {user ? (
                <div className="flex items-center gap-2">
                  {/* 🔔 Notificaciones de stock bajo */}
                  <div ref={notifRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setNotifOpen((v) => !v)}
                      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--hover)]"
                      aria-label="Notificaciones"
                      title={loadingCount ? 'Actualizando…' : 'Notificaciones'}
                    >
                      <Bell className="h-5 w-5" aria-hidden="true" />
                      {alertsCount > 0 ? (
                        <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-semibold text-white">
                          {alertsCount > 99 ? '99+' : alertsCount}
                        </span>
                      ) : null}
                    </button>

                    {notifOpen ? (
                      <div className="absolute right-0 mt-2 w-[min(22rem,90vw)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="text-sm font-semibold">Alertas de inventario</div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            onClick={refreshAlerts}
                          >
                            <RefreshCcw className={cn('h-4 w-4', loadingAlerts ? 'animate-spin' : '')} />
                            {loadingAlerts ? 'Actualizando…' : 'Actualizar'}
                          </button>
                        </div>

                        <div className="max-h-[20rem] overflow-y-auto">
                          {alerts.length === 0 ? (
                            <div className="px-4 py-6 text-sm text-[var(--text-secondary)]">
                              No hay alertas 🎉
                            </div>
                          ) : (
                            <ul className="divide-y divide-[var(--border)]">
                              {alerts.map((a) => {
                                const isCritical = a.stock <= 0
                                return (
                                  <li key={a.alertId} className="px-4 py-3 hover:bg-[var(--hover)]">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">{a.nombre}</div>
                                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                                          {a.sku ? `SKU: ${a.sku} · ` : null}
                                          Stock:{' '}
                                          <span
                                            className={
                                              isCritical
                                                ? 'font-semibold text-[var(--danger)]'
                                                : 'font-semibold'
                                            }
                                          >
                                            {a.stock}
                                          </span>{' '}
                                          / Mínimo: {a.stockMinimo}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-2">
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--hover)]"
                                          onClick={() => ackAlert(a.alertId)}
                                          title="Marcar como visto"
                                        >
                                          <Check className="h-4 w-4" />
                                          Visto
                                        </button>

                                        <button
                                          type="button"
                                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs hover:bg-[var(--hover)]"
                                          onClick={() => {
                                            setNotifOpen(false)
                                            navigate(`/inventario?inventarioId=${encodeURIComponent(a.inventarioId)}`)
                                          }}
                                        >
                                          Ver
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>

                        <div className="border-t border-[var(--border)] px-4 py-3">
                          <button
                            type="button"
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2 text-sm font-medium hover:bg-[var(--hover)]"
                            onClick={() => {
                              setNotifOpen(false)
                              navigate('/inventario')
                            }}
                          >
                            Ir a inventario
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden max-w-[14rem] truncate text-xs text-[var(--text-secondary)] sm:block">
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
                className="absolute inset-0 bg-[var(--overlay)]"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
              />
              <div className="absolute left-0 top-0 h-full w-full max-w-[22rem] overflow-y-auto border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 pb-6 text-[var(--sidebar-text)] shadow-xl sm:w-[min(20rem,85vw)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">Menú</div>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm transition hover:bg-[var(--hover)]"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-4">
                  <SidebarNav items={navItems} onNavigate={() => setMobileOpen(false)} />
                </div>
              </div>
            </div>
          ) : null}

          <main className="flex-1 p-4 pb-20 lg:p-6 lg:pb-6">
            <Outlet />
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border)] bg-[var(--surface)] lg:hidden">
            <div className="mx-auto flex max-w-[32rem] items-center justify-around px-2 py-2">
              {mobileNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--sidebar-muted)]',
                      isActive ? 'text-[var(--sidebar-primary)]' : 'hover:text-[var(--sidebar-text)]',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="max-w-[4.5rem] truncate text-center leading-none">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
