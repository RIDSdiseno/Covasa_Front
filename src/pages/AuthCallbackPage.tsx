import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { Navigate, useNavigate } from "react-router-dom";
import { ALLOWED_DOMAIN } from "../auth/msal";

function emailAllowed(email: string) {
  const e = (email || "").toLowerCase().trim();
  return e.endsWith(`@${ALLOWED_DOMAIN}`);
}

export default function AuthCallbackPage() {
  const { instance, accounts, inProgress } = useMsal();
  const navigate = useNavigate();

  useEffect(() => {
    if (inProgress !== "none") return;

    const acc = accounts[0];
    if (!acc) {
      navigate("/login", { replace: true });
      return;
    }

    // Validación dominio (por si acaso)
    const email = (acc.username || "").toLowerCase();
    if (!emailAllowed(email)) {
      instance.logoutRedirect().catch(() => {});
      return;
    }

    instance.setActiveAccount(acc);

    // Si guardaste "from" en localStorage (opcional), respétalo:
    const to = localStorage.getItem("covasa_login_redirect_to");
    if (to) localStorage.removeItem("covasa_login_redirect_to");

    navigate(to || "/dashboard", { replace: true });
  }, [inProgress, accounts, instance, navigate]);

  // Mientras MSAL procesa
  if (inProgress !== "none") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Procesando inicio de sesión...
      </div>
    );
  }

  // Si ya hay cuenta, evitamos parpadeos
  if (accounts.length > 0) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center">
      Redirigiendo...
    </div>
  );
}
