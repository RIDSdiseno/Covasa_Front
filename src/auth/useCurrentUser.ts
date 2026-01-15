import { useAuth } from "./auth";

export function useCurrentUser() {
  const { user, busy, error, clearError, loginMicrosoft, logout } = useAuth();

  const isLoggedIn = Boolean(user);

  return {
    user,
    isLoggedIn,
    busy,
    error,
    clearError,
    loginMicrosoft,
    logout,

    workerId: user?.workerId ?? null,
    role: user?.role ?? null,
    status: user?.status ?? null,

    requireUser() {
      if (!user) throw new Error("No hay sesión iniciada.");
      return user;
    },
  };
}
