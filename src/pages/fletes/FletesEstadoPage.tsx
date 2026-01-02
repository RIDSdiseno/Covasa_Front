// src/pages/fletes/FletesEstadoPage.tsx
import { useMemo, useState } from "react";
import { Search, Truck, Package, Eye, Loader2, X } from "lucide-react";
import Button from "../../components/ui/Button";

/* =========================
   Types (mock)
========================= */

type EstadoFlete = "NO_INICIADO" | "EN_CURSO" | "FINALIZADO";

type FleteProducto = {
  id: string;
  sku?: string | null;
  nombre: string;
  cantidad: number;
  unidad?: string | null; // ej: "un", "caja", "m2"
  pesoKg?: number | null;
  observacion?: string | null;
};

type FleteViaje = {
  id: string;
  folio: string; // ej: "FLT-000123"
  cliente?: string | null;

  origen?: string | null;
  destino?: string | null;

  chofer?: string | null;
  camion?: string | null; // patente o identificador

  estado: EstadoFlete;
  fechaProgramada?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;

  productos: FleteProducto[];
  observacion?: string | null;

  createdAt: string;
  updatedAt: string;
};

/* =========================
   Mock data
========================= */

function uid() {
  return crypto.randomUUID();
}
const nowISO = () => new Date().toISOString();

const MOCK_VIAJES: FleteViaje[] = [
  {
    id: uid(),
    folio: "FLT-000128",
    cliente: "OHL AUSTRAL S.A.",
    origen: "Bodega Central (Santiago)",
    destino: "Obra Las Condes",
    chofer: "Juan Pérez",
    camion: "ABCD-12",
    estado: "NO_INICIADO",
    fechaProgramada: "2026-01-03",
    startedAt: null,
    finishedAt: null,
    observacion: "Coordinar recepción con bodega obra.",
    productos: [
      { id: uid(), sku: "MAT-001", nombre: "Sellante PU 600ml", cantidad: 24, unidad: "un", pesoKg: 18 },
      { id: uid(), sku: "MAT-032", nombre: "Cinta masking 48mm", cantidad: 12, unidad: "un", pesoKg: 3.2 },
    ],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: uid(),
    folio: "FLT-000129",
    cliente: "CONSTRUCTORA GESCO S.A.",
    origen: "Bodega Central (Santiago)",
    destino: "Viña del Mar",
    chofer: "María Rojas",
    camion: "JKLP-34",
    estado: "EN_CURSO",
    fechaProgramada: "2026-01-02",
    startedAt: "2026-01-02T09:10:00.000Z",
    finishedAt: null,
    observacion: null,
    productos: [
      { id: uid(), sku: "MAT-050", nombre: "Silicona neutra 280ml", cantidad: 40, unidad: "un", pesoKg: 16 },
      { id: uid(), sku: "MAT-077", nombre: "Espuma expansiva", cantidad: 10, unidad: "un", pesoKg: 7.5 },
      { id: uid(), sku: "MAT-021", nombre: "Guantes nitrilo", cantidad: 6, unidad: "caja", pesoKg: 2.4 },
    ],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: uid(),
    folio: "FLT-000126",
    cliente: "CONSTRUCTORA HIPATIA SPA",
    origen: "Bodega Central (Santiago)",
    destino: "Rancagua",
    chofer: "Pedro Muñoz",
    camion: "QWER-56",
    estado: "FINALIZADO",
    fechaProgramada: "2025-12-28",
    startedAt: "2025-12-28T08:00:00.000Z",
    finishedAt: "2025-12-28T14:40:00.000Z",
    observacion: "Entregado sin novedades.",
    productos: [
      { id: uid(), sku: "MAT-010", nombre: "Primer anticorrosivo", cantidad: 8, unidad: "un", pesoKg: 12.8 },
    ],
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

/* =========================
   Helpers
========================= */

function prettyEstado(e: EstadoFlete) {
  if (e === "NO_INICIADO") return "No iniciado";
  if (e === "EN_CURSO") return "En curso";
  return "Finalizado";
}

function estadoPillClass(e: EstadoFlete) {
  if (e === "NO_INICIADO") return "bg-zinc-100 text-zinc-700";
  if (e === "EN_CURSO") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function empty(s?: string | null) {
  const v = (s ?? "").trim();
  return v ? v : "—";
}

function sumQty(items: FleteProducto[]) {
  return items.reduce((acc, x) => acc + (Number.isFinite(x.cantidad) ? x.cantidad : 0), 0);
}

function sumPeso(items: FleteProducto[]) {
  return items.reduce((acc, x) => acc + (x.pesoKg ?? 0), 0);
}

/* =========================
   Page
========================= */

export default function FletesEstadoPage() {
  const [items] = useState<FleteViaje[]>(() => MOCK_VIAJES);

  const [query, setQuery] = useState("");
  const [estado, setEstado] = useState<EstadoFlete | "ALL">("ALL");

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<FleteViaje | null>(null);

  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((x) => (estado === "ALL" ? true : x.estado === estado))
      .filter((x) => {
        if (!q) return true;
        return (
          x.folio.toLowerCase().includes(q) ||
          (x.cliente ?? "").toLowerCase().includes(q) ||
          (x.destino ?? "").toLowerCase().includes(q) ||
          (x.origen ?? "").toLowerCase().includes(q) ||
          (x.chofer ?? "").toLowerCase().includes(q) ||
          (x.camion ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.folio.localeCompare(b.folio));
  }, [items, query, estado]);

  async function openDetail(v: FleteViaje) {
    setLoadingId(v.id);
    await new Promise((r) => setTimeout(r, 220));
    setSelected(v);
    setOpen(true);
    setLoadingId(null);
  }

  function close() {
    setOpen(false);
    setSelected(null);
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Estado de fletes</div>
          <div className="text-[12px] text-[var(--text-secondary)]">
            Control de viajes: no iniciado / en curso / finalizado + detalle de carga.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder="Buscar por folio/cliente/destino/chofer..."
            />
          </div>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoFlete | "ALL")}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm transition focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="ALL">Todos</option>
            <option value="NO_INICIADO">No iniciado</option>
            <option value="EN_CURSO">En curso</option>
            <option value="FINALIZADO">Finalizado</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
            <tr>
              <th className="px-3 py-2">Folio</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Origen</th>
              <th className="px-3 py-2">Destino</th>
              <th className="px-3 py-2">Chofer / Camión</th>
              <th className="px-3 py-2">Carga</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Detalle</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-sm text-[var(--text-secondary)]" colSpan={8}>
                  Sin registros.
                </td>
              </tr>
            ) : (
              filtered.map((v) => {
                const loading = loadingId === v.id;
                const qty = sumQty(v.productos);
                const peso = sumPeso(v.productos);

                return (
                  <tr key={v.id} className="bg-[var(--surface)] transition hover:bg-[var(--hover)]">
                    <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{v.folio}</td>
                    <td className="px-3 py-2">{empty(v.cliente)}</td>
                    <td className="px-3 py-2">{empty(v.origen)}</td>
                    <td className="px-3 py-2">{empty(v.destino)}</td>
                    <td className="px-3 py-2">
                      <div className="text-[13px] text-[var(--text-primary)]">{empty(v.chofer)}</div>
                      <div className="text-[12px] text-[var(--text-secondary)]">{empty(v.camion)}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex items-center gap-2 text-[13px]">
                        <Package className="h-4 w-4 text-[var(--text-secondary)]" />
                        <span>
                          {v.productos.length} ítems · {qty} un
                        </span>
                      </div>
                      <div className="text-[12px] text-[var(--text-secondary)]">
                        Peso aprox: {peso ? `${peso.toFixed(1)} kg` : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${estadoPillClass(v.estado)}`}>
                        {prettyEstado(v.estado)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => void openDetail(v)}
                        aria-label={`Ver detalle ${v.folio}`}
                        title="Ver detalle"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal detalle */}
      {open && selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-[var(--overlay)]" onClick={close} aria-label="Cerrar" />

          <div className="relative w-full max-w-3xl rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Truck className="h-4 w-4 text-[var(--text-secondary)]" />
                  Detalle {selected.folio}
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-secondary)]">
                  {empty(selected.cliente)} · {empty(selected.origen)} → {empty(selected.destino)}
                </div>
              </div>

              <Button variant="secondary" size="icon" onClick={close} aria-label="Cerrar">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${estadoPillClass(selected.estado)}`}>
                {prettyEstado(selected.estado)}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Chofer: <b className="text-[var(--text-primary)]">{empty(selected.chofer)}</b>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Camión: <b className="text-[var(--text-primary)]">{empty(selected.camion)}</b>
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                Programado: <b className="text-[var(--text-primary)]">{empty(selected.fechaProgramada)}</b>
              </span>
            </div>

            {selected.observacion ? (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--hover)] px-3 py-2 text-sm">
                <div className="text-xs font-medium text-[var(--text-secondary)]">Observación</div>
                <div className="mt-1 text-[13px] text-[var(--text-primary)]">{selected.observacion}</div>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2 text-right">Cantidad</th>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2 text-right">Peso (kg)</th>
                    <th className="px-3 py-2">Obs.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {selected.productos.map((p) => (
                    <tr key={p.id} className="bg-[var(--surface)]">
                      <td className="px-3 py-2 text-[13px] text-[var(--text-secondary)]">{p.sku ?? "—"}</td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{p.nombre}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.cantidad}</td>
                      <td className="px-3 py-2">{p.unidad ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.pesoKg ?? "—"}</td>
                      <td className="px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                        {p.observacion ? (
                          <span title={p.observacion}>
                            {p.observacion.length > 44 ? `${p.observacion.slice(0, 44)}…` : p.observacion}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <Button variant="secondary" onClick={close}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
