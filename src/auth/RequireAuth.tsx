import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";

export default function RequireAuth({ children }: { children?: React.ReactNode }) {
  const { accounts, inProgress } = useMsal();
  const location = useLocation();

  // ✅ Mientras MSAL procesa redirect, NO redirijas
  if (inProgress !== "none") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando sesión...
      </div>
    );
  }

  if (accounts.length === 0) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
