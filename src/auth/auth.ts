import { createContext, useContext } from 'react'

export type AuthUser = {
  email: string
  name: string
}

export type AuthContextValue = {
  user: AuthUser | null
  login: (email: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return ctx
}
