import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Search, X, Eye, FileText, Loader2 } from "lucide-react";
import Button from "../../components/ui/Button";

/* =========================
   Tipos según tu API
========================= */

type CrmEstadoCotizacion = "NUEVA" | "EN_SEGUIMIENTO" | "GANADA" | "PERDIDA";

type CotizacionGanadaRow = {
  id: string;
  codigo: string; // COT-xxxx
  createdAt: string;
  updatedAt: string;

  // Datos cliente/contacto (según tu modelo ecommerce_cotizacion)
  nombreContacto: string;
  email: string;
  telefono: string;
  empresa?: string | null;
  rut?: string | null;

  // Totales
  subtotalNeto: number;
  iva: number;
  total: number;

  // CRM
  estadoCrm: CrmEstadoCotizacion;

  // extra calculado en tu listCotizaciones()
  itemsCount?: number;
};

type CotizacionesListResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  data: CotizacionGanadaRow[];
};

/* =========================
   Helpers
========================= */

const PAGE_SIZE = 20;
const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3000";

function clp(n: number) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$ ${Math.round(n).toLocaleString("es-CL")}`;
  }
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-CL");
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string" && err) return err;
  return fallback;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const ct = res.headers.get("content-type") || "";
  const body: unknown = ct.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof body === "object" && body !== null && "message" in body
        ? String((body as { message?: unknown }).message ?? `HTTP ${res.status}`)
        : typeof body === "string"
        ? body
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return body as T;
}

/* =========================
   Page
========================= */

export default function NotasVentaPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [from, setFrom] = useState(""); // yyyy-mm-dd (opcional si lo implementas en backend)
  const [to, setTo] = useState("");     // yyyy-mm-dd (opcional si lo implementas en backend)

  const [page, setPage] = useState(1);
  const [data, setData] = useState<CotizacionesListResponse>({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    data: [],
  });

  const totalPages = useMemo(() => Math.max(1, data.totalPages || 1), [data.totalPages]);

  async function load(targetPage: number) {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      // ✅ Esta es la clave: solo GANADAS
      params.set("estadoCrm", "GANADA");

      // Nota: from/to NO existen en tu controller todavía.
      // Si los quieres, hay que agregarlos al backend; por ahora los dejamos solo UI.
      // if (from) params.set("from", from);
      // if (to) params.set("to", to);

      params.set("page", String(targetPage));
      params.set("pageSize", String(PAGE_SIZE));

      const url = `${API_BASE_URL}/cotizaciones?${params.toString()}`;
      const res = await fetchJson<CotizacionesListResponse>(url);

      setData(res);
      setPage(res.page ?? targetPage);
    } catch (e: unknown) {
      setErr(getErrorMessage(e, "No se pudo cargar Notas de Venta (cotizaciones ganadas)."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    void load(1);
  }

  function clearFilters() {
    setQ("");
    setFrom("");
    setTo("");
    void load(1);
  }

  function openPdf(cotizacionId: string) {
    // ✅ Endpoint nuevo a implementar en backend:
    window.open(
      `${API_BASE_URL}/cotizaciones/${cotizacionId}/nota-venta/pdf`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notas de Venta</h1>
          <p className="text-sm text-slate-600">
            Aquí aparecen automáticamente las cotizaciones con estado CRM <b>GANADA</b>.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-8">
            <label className="text-xs text-slate-600">Buscar</label>
            <div className="flex items-center gap-2 border rounded-lg px-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                className="w-full py-2 outline-none text-sm"
                placeholder="Código, contacto, empresa, RUT, email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button
                  type="button"
                  className="p-1 text-slate-400 hover:text-slate-700"
                  onClick={() => setQ("")}
                  title="Limpiar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Desde (opcional)</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-2 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled
              title="Para filtrar por fechas hay que implementar from/to en el backend."
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Hasta (opcional)</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-2 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled
              title="Para filtrar por fechas hay que implementar from/to en el backend."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="text-sm text-slate-600">
            {data.total ? `${data.total.toLocaleString("es-CL")} resultados` : "—"}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Limpiar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Buscar
            </Button>
          </div>
        </div>

        {err && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">
            {err}
          </div>
        )}
      </form>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="py-2 px-3">Código</th>
                <th className="py-2 px-3">Fecha</th>
                <th className="py-2 px-3">Cliente / Contacto</th>
                <th className="py-2 px-3">Ítems</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading && data.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                    Cargando…
                  </td>
                </tr>
              ) : data.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No hay cotizaciones GANADAS para generar Nota de Venta.
                  </td>
                </tr>
              ) : (
                data.data.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-slate-50">
                    <td className="py-2 px-3 font-medium">{c.codigo}</td>
                    <td className="py-2 px-3">{fmtDate(c.createdAt)}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium">{c.empresa || c.nombreContacto}</div>
                      <div className="text-xs text-slate-500">
                        {c.rut ? `${c.rut} • ` : ""}
                        {c.email}
                      </div>
                    </td>
                    <td className="py-2 px-3">{c.itemsCount ?? "-"}</td>
                    <td className="py-2 px-3 text-right">{clp(c.total)}</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/documentos/cotizaciones/${c.id}`}
                          className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border hover:bg-white"
                          title="Ver cotización"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden md:inline">Ver</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => openPdf(c.id)}
                          className="inline-flex items-center gap-2 px-2 py-1 rounded-lg border hover:bg-white"
                          title="Descargar Nota de Venta (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                          <span className="hidden md:inline">PDF NV</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-3 border-t bg-white">
          <div className="text-sm text-slate-600">
            Página <b>{data.page}</b> de <b>{totalPages}</b>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
