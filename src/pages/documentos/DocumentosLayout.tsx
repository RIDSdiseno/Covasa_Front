import { NavLink, Outlet } from "react-router-dom";
import { cn } from "../../lib/cn";

export default function DocumentosLayout() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div>
          <div className="text-lg font-semibold text-[var(--text-primary)]">Documentos</div>
          <div className="mt-1 text-sm text-[var(--text-secondary)]">
            Cotizaciones, lista de cotizaciones y facturas.
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <NavLink
            to="cotizaciones"
            end
            className={({ isActive }) =>
              cn(
                "rounded-xl border px-3 py-2 text-sm",
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              )
            }
          >
            Cotizaciones
          </NavLink>

          {/* ✅ antes decía "Nota de ventas" */}
          <NavLink
            to="notas-venta"
            className={({ isActive }) =>
              cn(
                "rounded-xl border px-3 py-2 text-sm",
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              )
            }
          >
            Lista de cotizaciones
          </NavLink>

          <NavLink
            to="facturas"
            className={({ isActive }) =>
              cn(
                "rounded-xl border px-3 py-2 text-sm",
                isActive
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
              )
            }
          >
            Facturas
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
