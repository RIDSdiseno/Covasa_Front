import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCrmCotizaciones, type CrmCotizacion, type CrmListMeta } from "../../lib/crmApi";

type EstadoFiltro = "todas" | "NUEVA" | "EN_REVISION" | "RESPONDIDA" | "CERRADA";

const pageSize = 10;

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CrmCotizacionesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CrmCotizacion[]>([]);
  const [meta, setMeta] = useState<CrmListMeta>({
    page: 1,
    pageSize,
    total: 0,
    totalPages: 1,
  });

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [estado, setEstado] = useState<EstadoFiltro>("todas");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCrmCotizaciones({
        page,
        pageSize,
        q: debouncedQ.trim() || undefined,
        estado: estado === "todas" ? undefined : estado,
      });
      setItems(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setItems([]);
      setMeta({ page: 1, pageSize, total: 0, totalPages: 1 });
      setError(err?.message ?? "No se pudo cargar cotizaciones");
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, estado, page]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (page > meta.totalPages) setPage(meta.totalPages);
  }, [page, meta.totalPages]);

  const startIndex = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const endIndex = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cotizacion web</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Listado de cotizaciones ecommerce sincronizadas con el CRM.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Listado</div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              className="h-9 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm outline-none"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Buscar por codigo, rut, email..."
            />

            <select
              className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={estado}
              onChange={(event) => {
                setEstado(event.target.value as EstadoFiltro);
                setPage(1);
              }}
            >
              <option value="todas">Todas</option>
              <option value="NUEVA">NUEVA</option>
              <option value="EN_REVISION">EN_REVISION</option>
              <option value="RESPONDIDA">RESPONDIDA</option>
              <option value="CERRADA">CERRADA</option>
            </select>

            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
            >
              {loading ? "Cargando..." : "Refrescar"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
            Cargando cotizaciones...
          </div>
        ) : items.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
            No hay cotizaciones para mostrar.
          </div>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[var(--text-secondary)]">
                Mostrando{" "}
                <span className="font-medium text-[var(--text-primary)]">{startIndex}</span> -{" "}
                <span className="font-medium text-[var(--text-primary)]">{endIndex}</span> de{" "}
                <span className="font-medium text-[var(--text-primary)]">{meta.total}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={meta.page === 1}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                >
                  Anterior
                </button>
                <div className="text-xs text-[var(--text-secondary)]">
                  Pagina{" "}
                  <span className="font-medium text-[var(--text-primary)]">{meta.page}</span> de{" "}
                  <span className="font-medium text-[var(--text-primary)]">{meta.totalPages}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
                  disabled={meta.page === meta.totalPages}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)] disabled:opacity-60"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-[var(--hover)] text-xs text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Codigo</th>
                    <th className="px-3 py-2 font-medium">Correlativo</th>
                    <th className="px-3 py-2 font-medium">Origen</th>
                    <th className="px-3 py-2 font-medium">RUT</th>
                    <th className="px-3 py-2 font-medium">Nombre contacto</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Telefono</th>
                    <th className="px-3 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-3 py-2 text-right font-medium">IVA</th>
                    <th className="px-3 py-2 text-right font-medium">Total</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                    <th className="px-3 py-2 font-medium">Creada</th>
                    <th className="px-3 py-2 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-[var(--surface)]">
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{item.codigo}</td>
                      <td className="px-3 py-2">{item.correlativo}</td>
                      <td className="px-3 py-2">{item.origen}</td>
                      <td className="px-3 py-2">{item.rut || "-"}</td>
                      <td className="px-3 py-2">{item.nombreContacto}</td>
                      <td className="px-3 py-2">{item.email}</td>
                      <td className="px-3 py-2">{item.telefono}</td>
                      <td className="px-3 py-2 text-right">{money.format(item.subtotalNeto)}</td>
                      <td className="px-3 py-2 text-right">{money.format(item.iva)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{money.format(item.total)}</td>
                      <td className="px-3 py-2">{item.estado}</td>
                      <td className="px-3 py-2">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/cotizaciones/${item.id}`)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
