import { useEffect, useMemo, useState } from "react";
import {
  EventType,
  type AccountInfo,
  type AuthenticationResult,
  type EventMessage,
} from "@azure/msal-browser";
import { AuthContext, type CurrentUser, type LoginMicrosoftArgs } from "./auth";
import { msal, LOGIN_SCOPES, ALLOWED_DOMAIN } from "./msal";

const STORAGE_KEY = "covasa_user";
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://localhost:3000/api";

function toBaseUser(account: AccountInfo): CurrentUser {
  return {
    id: account.localAccountId,
    name: account.name || account.username,
    email: account.username,
    tenantId: account.tenantId,
  };
}

function isAllowed(account: AccountInfo) {
  const email = (account.username || "").toLowerCase().trim();
  return email.endsWith(`@${ALLOWED_DOMAIN}`);
}

async function syncWorkerToBackend(base: CurrentUser) {
  // ✅ si backend no está, esto debe fallar sin tumbar login
  const res = await fetch(`${API_BASE_URL}/auth/sync-worker`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: base.name,
      email: base.email,
      tenantId: base.tenantId ?? null,
    }),
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(body?.error || body?.message || "No se pudo sincronizar trabajador");
  }

  return body as { workerId: string; cargo?: string; estado?: string };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() {
    setError(null);
  }

  // storage sync
  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  // init redirect + set session (NO depende del backend)
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setBusy(true);

        const res = await msal.handleRedirectPromise();
        if (!mounted) return;

        const account =
          res?.account ||
          msal.getActiveAccount() ||
          msal.getAllAccounts()[0] ||
          null;

        if (!account) {
          return;
        }

        if (!isAllowed(account)) {
          setUser(null);
          setError(`Tu cuenta no pertenece al dominio permitido (@${ALLOWED_DOMAIN}).`);
          await msal.logoutRedirect({ account });
          return;
        }

        msal.setActiveAccount(account);

        // ✅ 1) setea sesión FRONT siempre
        const base = toBaseUser(account);
        setUser(base);

        // ✅ 2) intenta sync BACKEND sin romper login
        try {
          const sync = await syncWorkerToBackend(base);
          if (!mounted) return;

          setUser((prev) =>
            prev
              ? {
                  ...prev,
                  workerId: sync.workerId,
                  role: sync.cargo,
                  status: sync.estado,
                }
              : prev
          );
        } catch (e) {
          // ⚠️ NO logout. Solo avisar.
          setError(
            e instanceof Error
              ? `Sesión iniciada, pero no se pudo sincronizar con backend: ${e.message}`
              : "Sesión iniciada, pero no se pudo sincronizar con backend."
          );
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error inicializando MSAL");
      } finally {
        setBusy(false);
      }
    }

    init();

    const cbId = msal.addEventCallback(async (ev: EventMessage) => {
      if (ev.eventType !== EventType.LOGIN_SUCCESS) return;

      const payload = ev.payload as AuthenticationResult | null;
      const account = payload?.account;
      if (!account) return;

      if (!isAllowed(account)) {
        setUser(null);
        setError(`Tu cuenta no pertenece al dominio permitido (@${ALLOWED_DOMAIN}).`);
        msal.logoutRedirect({ account });
        return;
      }

      msal.setActiveAccount(account);

      const base = toBaseUser(account);
      setUser(base);

      // best effort sync
      try {
        const sync = await syncWorkerToBackend(base);
        setUser((prev) =>
          prev
            ? { ...prev, workerId: sync.workerId, role: sync.cargo, status: sync.estado }
            : prev
        );
      } catch (e) {
        setError(
          e instanceof Error
            ? `Sesión iniciada, pero no se pudo sincronizar con backend: ${e.message}`
            : "Sesión iniciada, pero no se pudo sincronizar con backend."
        );
      }
    });

    return () => {
      mounted = false;
      if (cbId) msal.removeEventCallback(cbId);
    };
  }, []);

  async function loginMicrosoft(args?: LoginMicrosoftArgs) {
    clearError();
    setBusy(true);
    try {
      const redirectTo = args?.redirectTo || window.location.pathname;
      localStorage.setItem("covasa_login_redirect_to", redirectTo);
      await msal.loginRedirect({ scopes: LOGIN_SCOPES });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión");
      setBusy(false);
    }
  }

  async function logout() {
    clearError();
    setBusy(true);
    try {
      const account = msal.getActiveAccount() || msal.getAllAccounts()[0];
      setUser(null);
      await msal.logoutRedirect({ account: account || undefined });
    } finally {
      setBusy(false);
    }
  }

  const value = useMemo(
    () => ({ user, busy, error, loginMicrosoft, logout, clearError }),
    [user, busy, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
