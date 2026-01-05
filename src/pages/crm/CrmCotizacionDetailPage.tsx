import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchCrmCotizacionById, type CrmCotizacion } from "../../lib/crmApi";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function CrmCotizacionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<CrmCotizacion | null>(null);
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

  useEffect(() => {
    if (!id) {
      setError("ID invalido");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCrmCotizacionById(id);
        setItem(data);
      } catch (err: any) {
        setItem(null);
        setError(err?.message ?? "No se pudo cargar la cotizacion");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detalle de cotizacion</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Vista completa de la cotizacion ecommerce seleccionada.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/cotizaciones")}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--hover)]"
        >
          Volver al listado
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--hover)] px-4 py-6 text-center text-sm text-[var(--text-secondary)]">
          Cargando cotizacion...
        </div>
      ) : item ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="text-sm font-semibold">Identificacion</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">ID</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {item.id}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Correlativo</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.correlativo}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Codigo</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.codigo}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Origen</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.origen}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Estado</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.estado}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Creada</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Actualizada</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {formatDate(item.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="text-sm font-semibold">Cliente y contacto</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Nombre contacto</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {item.nombreContacto}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Email</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.email}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Telefono</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.telefono}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Empresa</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.empresa || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">RUT</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.rut || "-"}
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">clienteId</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.clienteId || "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">ecommerceClienteId</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    {item.ecommerceClienteId || "-"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="text-sm font-semibold">Totales</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Subtotal neto</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold">
                    {money.format(item.subtotalNeto)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">IVA</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold">
                    {money.format(item.iva)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--text-secondary)]">Total</div>
                  <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-semibold">
                    {money.format(item.total)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <div className="text-sm font-semibold">Observaciones</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">Observaciones</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {item.observaciones || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">OC cliente</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {item.ocCliente || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)]">crmCotizacionId</div>
                <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                  {item.crmCotizacionId || "-"}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
