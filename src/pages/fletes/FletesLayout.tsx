// src/pages/fletes/FletesLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { Truck, Activity } from "lucide-react";
import { cn } from "../../lib/cn";

type Tab = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  hint?: string;
};

const tabs: Tab[] = [
  { to: "/fletes", label: "Tarifas", icon: Truck, end: true, hint: "Lista y mantenimiento de tarifas." },
  { to: "/fletes/estado", label: "Estado", icon: Activity, hint: "Viajes de flete + estado y detalle de carga." },
];

export default function FletesLayout() {
  return (
    <div className="space-y-4">
      {/* Header + Tabs */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Fletes</div>
            <div className="text-[12px] text-[var(--text-secondary)]">
              Configuración de tarifas y control de viajes.
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              title={t.hint}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shadow-sm transition",
                  "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]",
                  isActive ? "border-[var(--primary)] ring-2 ring-[var(--primary)]" : "",
                )
              }
            >
              <t.icon className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="font-medium">{t.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Contenido de la pestaña */}
      <Outlet />
    </div>
  );
}
