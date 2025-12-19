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
    <div className="relative min-h-screen bg-slate-950">
      <div className="absolute inset-0">
        <img
          src="/img/fondo_login.png"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/60" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1200px] items-center justify-center p-4 lg:justify-end">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
              <img
                src="/img/logo.png"
                alt="COVASA"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <div className="text-lg font-semibold leading-tight text-slate-900">
                COVASA
              </div>
              <div className="text-xs text-slate-800">
                Iniciar sesión al sistema
              </div>
            </div>
          </div>

          <form
            className="mt-6 space-y-4"
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
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-900">
                Correo
              </span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-brand/40 focus:ring-2"
                placeholder="xlazo@covasachile.cl"
                autoComplete="email"
              />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-slate-900">
                Contraseña
              </span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none ring-brand/40 focus:ring-2"
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

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
            Demo: por ahora acepta cualquier contraseña (no hay backend aún).
          </div>
        </div>
      </div>
    </div>
  )
}
