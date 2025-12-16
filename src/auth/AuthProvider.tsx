import { useCallback, useMemo, useState } from 'react'
import { AuthContext, type AuthContextValue, type AuthUser } from './auth'

const STORAGE_KEY = 'covasa.auth.user'

function safeParseUser(raw: string | null): AuthUser | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function buildUser(email: string): AuthUser {
  const nameFromEmail = email.split('@')[0]?.replaceAll('.', ' ') ?? email
  return { email, name: nameFromEmail }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    safeParseUser(localStorage.getItem(STORAGE_KEY)),
  )

  const login = useCallback((email: string) => {
    const nextUser = buildUser(email)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
