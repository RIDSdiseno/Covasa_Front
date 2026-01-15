import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { loginRequest, ALLOWED_DOMAIN } from "../auth/msal";
import Button from "../components/ui/Button";

type LocationState = {
  from?: { pathname?: string };
};

function emailAllowed(email: string) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith(`@${ALLOWED_DOMAIN}`);
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} role="img" aria-hidden="true">
      <path fill="#f25022" d="M1 1h10v10H1z" />
      <path fill="#7fba00" d="M12 1h10v10H12z" />
      <path fill="#00a4ef" d="M1 11h10v10H1z" />
      <path fill="#ffb900" d="M12 12h10v10H12z" />
    </svg>
  );
}

export default function LoginPage() {
  const { instance, accounts, inProgress } = useMsal();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const isLoggingIn = inProgress !== "none";

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from?.pathname && state.from.pathname !== "/login"
      ? state.from.pathname
      : "/dashboard";
  }, [location.state]);

  const activeEmail = (accounts?.[0]?.username || "").toLowerCase();
  const hasAccount = accounts.length > 0;
  const hasValidAccount = hasAccount && emailAllowed(activeEmail);

  const domainError = useMemo(() => {
    if (!hasAccount) return null;
    if (hasValidAccount) return null;
    return `Acceso denegado. Usa tu cuenta @${ALLOWED_DOMAIN}`;
  }, [hasAccount, hasValidAccount]);

  useEffect(() => {
    if (domainError) {
      const timer = setTimeout(() => instance.logoutRedirect().catch(() => {}), 3000);
      return () => clearTimeout(timer);
    }
  }, [domainError, instance]);

  async function signIn() {
    setError(null);
    try {
      await instance.loginRedirect({ ...loginRequest, prompt: "select_account" });
    } catch (e: unknown) {
      setError("Error de autenticación");
    }
  }

  if (hasValidAccount) return <Navigate to={redirectTo} replace />;

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gray-100 font-sans antialiased">
      
      {/* FONDO CON IMAGEN */}
      <div className="absolute inset-0 z-0">
        <img
          src="/img/fondo_login.png"
          alt=""
          className="h-full w-full object-cover brightness-[0.9]"
        />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[4px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40" />
      </div>

      <main className="relative z-10 w-full max-w-[440px] px-6">
        <div className="relative overflow-hidden rounded-[3.5rem] border border-white bg-white/80 p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] backdrop-blur-2xl">
          
          <header className="flex flex-col items-center">
            {/* LOGO CIRCULAR */}
            <div className="group relative mb-8 h-44 w-44 overflow-hidden rounded-full bg-white shadow-2xl border-4 border-white">
              <img
                src="/img/logo.png"
                alt="COVASA"
                className="h-full w-full object-cover"
              />
            </div>

            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase">
              COVASA
            </h1>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.6em] text-gray-500">
              Sistemas de Acceso
            </p>
          </header>

          <div className="my-10 h-px w-full bg-gray-200" />

          {/* MENSAJES DE ERROR */}
          {(domainError || error) && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-xs font-bold text-red-700">
              {domainError || error}
            </div>
          )}

          {/* BOTÓN NEGRO PREMIUM */}
          <div className="space-y-6">
            <Button
              onClick={signIn}
              disabled={isLoggingIn}
              className="group relative h-16 w-full overflow-hidden rounded-2xl bg-[#1a1a1a] text-white shadow-2xl transition-all hover:bg-black active:scale-[0.98] disabled:opacity-70"
            >
              <div className="relative z-10 flex items-center justify-center gap-4">
                {isLoggingIn ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <div className="rounded-lg bg-white/10 p-2">
                    <MicrosoftLogo className="h-5 w-5" />
                  </div>
                )}
                <span className="text-sm font-black uppercase tracking-widest">
                  {isLoggingIn ? "Autenticando..." : "Entrar con Microsoft"}
                </span>
              </div>
            </Button>

            {/* DOMINIO: Texto más oscuro para legibilidad */}
            <div className="flex flex-col items-center gap-1 rounded-2xl border border-gray-200 bg-white/50 py-4 shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Uso Institucional</span>
              <span className="text-sm font-bold text-gray-900">@{ALLOWED_DOMAIN}</span>
            </div>
          </div>
        </div>

        {/* FOOTER: CORREGIDO (Color más oscuro y peso fuerte) */}
        <footer className="mt-12 text-center drop-shadow-sm">
          <p className="text-[11px] font-bold tracking-[0.3em] text-gray-700 uppercase">
            &copy; {new Date().getFullYear()} COVASA &middot; <span className="text-gray-900">Departamento de TI</span>
          </p>
          <div className="mt-2 text-[9px] font-black tracking-[0.1em] text-gray-500 uppercase">
            Acceso Protegido por Microsoft Azure
          </div>
        </footer>
      </main>
    </div>
  );
}