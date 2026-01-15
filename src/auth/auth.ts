import { createContext, useContext } from "react";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  tenantId?: string;

  // ✅ campos del sistema (backend)
  workerId?: string;
  role?: string;
  status?: string;
};

export type LoginMicrosoftArgs = {
  redirectTo?: string;
};

export type AuthContextValue = {
  user: CurrentUser | null;
  busy: boolean;
  error: string | null;

  loginMicrosoft: (args?: LoginMicrosoftArgs) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider />");
  return ctx;
}
