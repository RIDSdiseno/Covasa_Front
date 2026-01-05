import { useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth'
import Button from '../components/ui/Button'

type LocationState = {
  from?: { pathname?: string }
}

function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value)
}

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null
    return state?.from?.pathname && state.from.pathname !== '/login'
      ? state.from.pathname
      : '/dashboard'
  }, [location.state])

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="relative min-h-screen bg-[var(--app-bg)]">
      <div className="absolute inset-0">
        <img
          src="/img/fondo_login.png"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[rgba(0,0,0,var(--login-overlay-alpha))] backdrop-blur-[var(--login-overlay-blur)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1200px] items-center justify-center p-4 lg:justify-end">
        <div className="w-full max-w-md rounded-3xl border border-[color:rgba(0,0,0,var(--login-card-border-alpha))] bg-[rgba(255,255,255,var(--login-card-alpha))] p-8 text-[color:var(--login-text)] shadow-[var(--login-card-shadow)] backdrop-blur-[var(--login-card-blur)]">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--app-bg)] shadow-md ring-1 ring-black/5">
              <img
                src="/img/logo.png"
                alt="COVASA"
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="mt-4">
              <div className="text-xl font-semibold leading-tight tracking-tight text-[color:var(--login-text)]">
                COVASA
              </div>
              <div className="mt-1 text-sm text-[color:var(--login-label)]">
                Iniciar sesión al sistema
              </div>
            </div>
          </div>

          <form
            className="mt-7 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setError(null)

              if (!isValidEmail(email)) {
                setError('Ingresa un correo válido.')
                return
              }
              if (!password.trim()) {
                setError('Ingresa tu contraseña.')
                return
              }

              login(email.trim())
              navigate(redirectTo, { replace: true })
            }}
          >
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold text-[color:var(--login-label)]">
                Correo
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[color:var(--login-text)] outline-none ring-primary placeholder:text-[color:var(--text-secondary)] placeholder:opacity-70 focus:ring-2"
                placeholder="admin@covasachile.cl"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold text-[color:var(--login-label)]">
                Contraseña
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[color:var(--login-text)] outline-none ring-primary placeholder:text-[color:var(--text-secondary)] placeholder:opacity-70 focus:ring-2"
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-11 w-full rounded-2xl">
              Entrar
            </Button>
          </form>

          <div className="mt-5 rounded-2xl bg-[var(--hover)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            Demo: por ahora acepta cualquier contraseña (no hay backend aún).
          </div>
        </div>
      </div>
    </div>
  )
}



