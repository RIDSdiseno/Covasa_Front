import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";
import { cn } from "../../lib/cn";

const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000/api";

/* =========================
   API helpers
========================= */

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (isRecord(err) && typeof err.message === "string") return err.message;
  return fallback;
}
function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await safeJson(res);
  if (!res.ok) {
    const msg =
      (isRecord(data) && typeof data.message === "string" && data.message) ||
      `Error ${res.status} al llamar ${path}`;
    throw new Error(msg);
  }
  return data as T;
}

/** =========================
 * Types
 * ========================= */

type TipoCliente = "PERSONA" | "EMPRESA";

type EmpresaDb = {
  id: string;
  nombre: string;
  rut: string | null;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null; // ✅ NUEVO (para sugerir dirección)
  lineaCredito?: number | null;
};

type ApiInventarioRow = {
  id: string;
  productoId: string;
  stock: number;
  minimo?: number;
  producto?: {
    id: string;
    nombre: string;
    sku: string | null;
    unidadMedida: string;
  } | null;
};

type ApiFleteTarifa = {
  id: string;
  nombre: string;
  zona: string | null;
  destino: string | null;
  precio: number; // CLP
  activo: boolean;
  observacion: string | null;
  createdAt: string;
  updatedAt: string;
};

type ItemDraft = {
  productoId: string;
  descripcion: string;
  cantidad: string; // input
  costoUnitarioNeto: string; // input (costo)
  ivaPct: string; // IVA por ítem (si está vacío usa IVA default)
};

// ✅ Ahora mandamos campos CRM unificados en la misma cotización
type CreateCotizacionBody = {
  origen?: string;
  clienteId?: string | null;

  nombreContacto: string;
  email: string;
  telefono: string;

  empresa?: string | null;
  rut?: string | null;

  // ✅ CRM unificado
  direccion?: string | null;
  nombreObra?: string | null;

  // ✅ Flete
  tieneFlete?: boolean;
  fleteTarifaId?: string | null;

  observaciones?: string | null;
  ocCliente?: string | null;

  items: Array<{
    productoId: string;
    descripcion?: string;
    cantidad: number;
    precioUnitarioNeto: number; // precio de venta neto (costo + ganancia)
    ivaPct?: number;
  }>;
};

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function toInt(v: string, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

/* =========================
   ✅ ComboBox simple (sin libs)
========================= */

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function ProductComboBox({
  value,
  onChange,
  options,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (productoId: string) => void;
  options: ApiInventarioRow[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => {
    const id = value?.trim();
    if (!id) return null;
    return options.find((r) => r.productoId === id || r.producto?.id === id) ?? null;
  }, [value, options]);

  const filtered = useMemo(() => {
    const query = normalizeText(q);
    if (!query) return options;

    return options.filter((r) => {
      const nombre = normalizeText(r.producto?.nombre ?? "");
      const sku = normalizeText(r.producto?.sku ?? "");
      const pid = normalizeText(r.productoId);
      return nombre.includes(query) || sku.includes(query) || pid.includes(query);
    });
  }, [q, options]);

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      const el = ev.target as Node | null;
      if (!wrapRef.current || !el) return;
      if (!wrapRef.current.contains(el)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const labelSelected = selected?.producto?.nombre || (selected ? selected.productoId : "");

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mt-1 flex w-full items-center justify-between gap-2 rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm",
          "border-[var(--border)]",
          disabled ? "opacity-60" : "hover:bg-[var(--hover)]"
        )}
      >
        <span className={cn("truncate", !value ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]")}>
          {value ? labelSelected : placeholder ?? "Selecciona producto..."}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">▾</span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="p-2">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o SKU..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </div>

          <div className="max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">Sin resultados</div>
            ) : (
              filtered.map((r) => {
                const nombre = r.producto?.nombre ?? r.productoId;
                const sku = r.producto?.sku;
                const isActive = value === r.productoId;

                return (
                  <button
                    key={r.productoId}
                    type="button"
                    onClick={() => {
                      onChange(r.productoId);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm",
                      isActive ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--hover)]"
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-[var(--text-primary)]">{nombre}</div>
                      <div className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                        {sku ? `SKU: ${sku} · ` : ""}
                        ID: {r.productoId}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-[var(--text-secondary)]">Stock: {r.stock ?? 0}</div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================
   Flete helpers UI
========================= */

const UMBRAL_FLETE_GRATIS_NETO = 100_000;
const IVA_FLETE_PCT = 19;

function detectaSantiagoRM(zona: string | null | undefined, destino: string | null | undefined) {
  const z = (zona ?? "").toLowerCase();
  const d = (destino ?? "").toLowerCase();
  return (
    z.includes("santiago") ||
    d.includes("santiago") ||
    z.includes("rm") ||
    d.includes("rm") ||
    z.includes("metropolitana") ||
    d.includes("metropolitana")
  );
}

export default function CrearCotizacionForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cliente
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("EMPRESA");
  const [empresas, setEmpresas] = useState<EmpresaDb[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");

  // Contacto
  const [nombreContacto, setNombreContacto] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Empresa / Persona
  const [empresaNombreManual, setEmpresaNombreManual] = useState("");
  const [rut, setRut] = useState("");

  // CRM
  const [direccion, setDireccion] = useState("");
  const [nombreObra, setNombreObra] = useState("");

  // Comercial
  const [gananciaPct, setGananciaPct] = useState<string>("25");
  const ivaDefaultPct = "19";
  const [ocCliente, setOcCliente] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  // Inventario
  const [inventario, setInventario] = useState<ApiInventarioRow[]>([]);
  const [invError, setInvError] = useState<string | null>(null);

  // ✅ Fletes
  const [fletes, setFletes] = useState<ApiFleteTarifa[]>([]);
  const [fletesError, setFletesError] = useState<string | null>(null);
  const [tieneFlete, setTieneFlete] = useState<boolean>(false);
  const [fleteTarifaId, setFleteTarifaId] = useState<string>("");

  // Items
  const [items, setItems] = useState<ItemDraft[]>([
    { productoId: "", descripcion: "", cantidad: "1", costoUnitarioNeto: "0", ivaPct: "" },
  ]);

  const canValidateStock = inventario.length > 0 && !invError;

  // Cargar empresas, inventario y fletes cuando abre
  useEffect(() => {
    if (!open) return;

    setError(null);
    setInvError(null);
    setFletesError(null);

    (async () => {
      try {
        const rows = await api<EmpresaDb[]>("/clientes");
        setEmpresas(Array.isArray(rows) ? rows : []);
      } catch {
        setEmpresas([]);
      }
    })();

    (async () => {
      try {
        const rows = await api<ApiInventarioRow[]>("/inventario");
        setInventario(Array.isArray(rows) ? rows : []);
      } catch (e) {
        setInventario([]);
        setInvError(getErrorMessage(e, "No se pudo cargar inventario"));
      }
    })();

    (async () => {
      try {
        const rows = await api<ApiFleteTarifa[]>("/fletes?activo=true");
        const list = Array.isArray(rows) ? rows : [];
        setFletes(list.filter((x) => x.activo));
      } catch (e) {
        setFletes([]);
        setFletesError(getErrorMessage(e, "No se pudo cargar fletes"));
      }
    })();
  }, [open]);

  // Autocompletar desde empresa elegida
  useEffect(() => {
    if (tipoCliente !== "EMPRESA") return;
    const emp = empresas.find((x) => x.id === empresaId);
    if (!emp) return;

    if (!nombreContacto) setNombreContacto(emp.nombre || "");
    if (!rut && emp.rut) setRut(emp.rut);
    if (!email && emp.email) setEmail(emp.email);
    if (!telefono && emp.telefono) setTelefono(emp.telefono);
    if (!direccion && emp.direccion) setDireccion(emp.direccion);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, empresas, tipoCliente]);

  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    []
  );
  const money = (n: number) => moneyFmt.format(Number.isFinite(n) ? n : 0);

  function findInv(productoId: string) {
    const id = (productoId || "").trim();
    if (!id) return undefined;
    return inventario.find((r) => r.productoId === id || r.producto?.id === id);
  }

  const selectedFlete = useMemo(() => {
    const id = fleteTarifaId.trim();
    if (!id) return null;
    return fletes.find((f) => f.id === id) ?? null;
  }, [fleteTarifaId, fletes]);

  // ✅ calc ahora incluye flete + iva final + total final
  const calc = useMemo(() => {
    const g = Number(gananciaPct);
    const factor = Number.isFinite(g) ? 1 + g / 100 : 1;
    const ivaGlobal = clampInt(toInt(ivaDefaultPct, 19), 0, 100);

    const itemsParsed = items.map((it) => {
      const cantidad = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
      const costoUnit = Math.max(0, Math.round(Number(it.costoUnitarioNeto) || 0));

      const costoNeto = costoUnit * cantidad;

      const ventaUnit = Math.round(costoUnit * factor);
      const ventaNeto = ventaUnit * cantidad;

      const ivaPctItem = it.ivaPct.trim()
        ? clampInt(toInt(it.ivaPct, ivaGlobal), 0, 100)
        : ivaGlobal;

      const iva = Math.round(ventaNeto * (ivaPctItem / 100));
      const total = ventaNeto + iva;

      return { cantidad, costoUnit, costoNeto, ventaUnit, ventaNeto, ivaPctItem, iva, total };
    });

    const costoTotal = itemsParsed.reduce((acc, it) => acc + it.costoNeto, 0);
    const ventaNetaTotal = itemsParsed.reduce((acc, it) => acc + it.ventaNeto, 0);
    const gananciaTotal = ventaNetaTotal - costoTotal;

    const ivaProductos = itemsParsed.reduce((acc, it) => acc + it.iva, 0);
    const totalProductos = ventaNetaTotal + ivaProductos;

    // ✅ flete
    let fleteNeto = 0;
    let fleteGratis = false;
    let fleteEsSantiago = false;

    if (tieneFlete && selectedFlete) {
      fleteEsSantiago = detectaSantiagoRM(selectedFlete.zona, selectedFlete.destino);
      fleteGratis = fleteEsSantiago && ventaNetaTotal > UMBRAL_FLETE_GRATIS_NETO;
      fleteNeto = fleteGratis ? 0 : Math.max(0, Math.trunc(selectedFlete.precio ?? 0));
    }

    const fleteIva = Math.round(fleteNeto * (IVA_FLETE_PCT / 100));
    const fleteTotal = fleteNeto + fleteIva;

    const ivaFinal = ivaProductos + fleteIva;
    const totalFinal = totalProductos + fleteTotal;

    return {
      factor,
      ivaGlobal,

      costoTotal,
      gananciaTotal,

      // productos
      ventaNetaTotal,
      ivaProductos,
      totalProductos,

      // flete
      fleteNeto,
      fleteIva,
      fleteTotal,
      fleteGratis,
      fleteEsSantiago,

      // final
      ivaFinal,
      totalFinal,
    };
  }, [items, gananciaPct, ivaDefaultPct, tieneFlete, selectedFlete]);

  // ✅ preview: ahora muestra neto/iva/total flete
  const fletePreview = useMemo(() => {
    if (!tieneFlete || !selectedFlete) return null;

    const esSantiago = detectaSantiagoRM(selectedFlete.zona, selectedFlete.destino);
    const gratis = esSantiago && calc.ventaNetaTotal > UMBRAL_FLETE_GRATIS_NETO;

    const neto = gratis ? 0 : Math.max(0, Math.trunc(selectedFlete.precio ?? 0));
    const iva = Math.round(neto * (IVA_FLETE_PCT / 100));
    const total = neto + iva;

    return { esSantiago, gratis, neto, iva, total };
  }, [tieneFlete, selectedFlete, calc.ventaNetaTotal]);

  function setItem(i: number, patch: Partial<ItemDraft>) {
    setItems((cur) => cur.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function addItem() {
    setItems((cur) => [
      ...cur,
      { productoId: "", descripcion: "", cantidad: "1", costoUnitarioNeto: "0", ivaPct: "" },
    ]);
  }

  function removeItem(i: number) {
    setItems((cur) => (cur.length <= 1 ? cur : cur.filter((_, idx) => idx !== i)));
  }

  function resetForm() {
    setTipoCliente("EMPRESA");
    setEmpresaId("");
    setNombreContacto("");
    setEmail("");
    setTelefono("");
    setEmpresaNombreManual("");
    setRut("");
    setDireccion("");
    setNombreObra("");
    setGananciaPct("25");
    setOcCliente("");
    setObservaciones("");

    setTieneFlete(false);
    setFleteTarifaId("");

    setItems([{ productoId: "", descripcion: "", cantidad: "1", costoUnitarioNeto: "0", ivaPct: "" }]);
  }

  function validateStockBeforeSubmit(): string | null {
    if (!canValidateStock) return null;

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const productoId = it.productoId.trim();
      if (!productoId) return `Item #${idx + 1}: debes seleccionar un producto`;

      const cantidad = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
      const row = findInv(productoId);

      if (!row) return `Item #${idx + 1}: producto no existe en inventario`;

      const stock = row.stock ?? 0;
      if (cantidad > stock) {
        const nombre = row.producto?.nombre ?? productoId;
        return `Item #${idx + 1}: cantidad (${cantidad}) supera stock (${stock}) — ${nombre}`;
      }
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nombreContacto.trim()) return setError("Falta nombre de contacto.");
    if (!email.trim()) return setError("Falta email.");
    if (!telefono.trim()) return setError("Falta teléfono.");

    if (tipoCliente === "EMPRESA" && !empresaId) {
      return setError("Debes seleccionar una empresa.");
    }

    if (tieneFlete && !fleteTarifaId.trim()) {
      return setError("Selecciona una tarifa de flete (o desmarca 'Incluir flete').");
    }

    const stockErr = validateStockBeforeSubmit();
    if (stockErr) return setError(stockErr);

    const g = Number(gananciaPct);
    const factor = Number.isFinite(g) ? 1 + g / 100 : 1;

    const ivaGlobal = clampInt(toInt(ivaDefaultPct, 19), 0, 100);

    let payloadItems: CreateCotizacionBody["items"];
    try {
      payloadItems = items.map((it, idx) => {
        const productoId = it.productoId.trim();
        if (!productoId) throw new Error(`Item #${idx + 1}: productoId es obligatorio`);

        const cantidad = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
        const costo = Math.max(0, Math.round(Number(it.costoUnitarioNeto) || 0));
        const precioVentaNeto = Math.round(costo * factor);

        const ivaPctItem = it.ivaPct.trim()
          ? clampInt(toInt(it.ivaPct, ivaGlobal), 0, 100)
          : ivaGlobal;

        return {
          productoId,
          descripcion: it.descripcion?.trim() || undefined,
          cantidad,
          precioUnitarioNeto: precioVentaNeto,
          ivaPct: ivaPctItem,
        };
      });
    } catch (err) {
      setError(getErrorMessage(err, "Items inválidos"));
      return;
    }

    const empresaNombreDb = empresas.find((x) => x.id === empresaId)?.nombre ?? null;

    const body: CreateCotizacionBody = {
      origen: "MANUAL",
      clienteId: tipoCliente === "EMPRESA" ? empresaId : null,

      nombreContacto: nombreContacto.trim(),
      email: email.trim(),
      telefono: telefono.trim(),

      empresa: tipoCliente === "EMPRESA" ? empresaNombreDb : empresaNombreManual.trim() || null,
      rut: rut.trim() || null,

      direccion: direccion.trim() || null,
      nombreObra: nombreObra.trim() || null,

      tieneFlete: tieneFlete ? true : false,
      fleteTarifaId: tieneFlete ? fleteTarifaId.trim() : null,

      observaciones: observaciones.trim() || null,
      ocCliente: ocCliente.trim() || null,

      items: payloadItems,
    };

    setBusy(true);
    try {
      await api("/cotizaciones", { method: "POST", body: JSON.stringify(body) });
      resetForm();
      onCreated?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo crear la cotización"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!tieneFlete) setFleteTarifaId("");
  }, [tieneFlete]);

  if (!open) return null;

  const submitDisabled =
    busy ||
    (canValidateStock &&
      items.some((it) => {
        const row = it.productoId ? findInv(it.productoId) : undefined;
        const stock = row?.stock ?? 0;
        const qty = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
        return !it.productoId || !row || qty > stock;
      })) ||
    (tieneFlete && !fleteTarifaId.trim());

  const submitTitle =
    (canValidateStock &&
      items.some((it) => {
        const row = it.productoId ? findInv(it.productoId) : undefined;
        const stock = row?.stock ?? 0;
        const qty = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
        return !it.productoId || !row || qty > stock;
      }))
      ? "Revisa productos y stock antes de crear"
      : tieneFlete && !fleteTarifaId.trim()
      ? "Selecciona una tarifa de flete"
      : undefined;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-[var(--overlay)]"
        onClick={busy ? undefined : onClose}
        aria-label="Cerrar"
        type="button"
      />

      {/* container */}
      <div className="relative flex h-full w-full items-end justify-center p-2 sm:items-center sm:p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-[var(--surface)] shadow-xl">
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
            <div>
              <div className="text-sm font-semibold">Nueva cotización</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                Selecciona cliente, agrega productos, define % ganancia y edita IVA por ítem.
              </div>
              {invError ? (
                <div className="mt-2 text-xs text-amber-700">
                  {invError} (no se validará stock aquí; igual se valida en backend)
                </div>
              ) : null}
              {fletesError ? (
                <div className="mt-2 text-xs text-amber-700">{fletesError} (no podrás seleccionar flete aquí)</div>
              ) : null}
            </div>

            <Button variant="secondary" size="icon" onClick={onClose} disabled={busy} aria-label="Cerrar">
              ✕
            </Button>
          </div>

          <div className="max-h-[calc(100vh-140px)] overflow-y-auto p-4">
            <form onSubmit={onSubmit} className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              {/* Tipo cliente */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--hover)] p-4">
                <div className="text-xs font-semibold text-[var(--text-secondary)]">Cliente</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoCliente("PERSONA")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      tipoCliente === "PERSONA"
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    )}
                  >
                    Persona natural
                  </button>

                  <button
                    type="button"
                    onClick={() => setTipoCliente("EMPRESA")}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm",
                      tipoCliente === "EMPRESA"
                        ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                    )}
                  >
                    Empresa (BD)
                  </button>
                </div>

                {tipoCliente === "EMPRESA" ? (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-[var(--text-secondary)]">Empresa</label>
                      <select
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        value={empresaId}
                        onChange={(e) => setEmpresaId(e.target.value)}
                      >
                        <option value="">Selecciona una empresa...</option>
                        {empresas.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.nombre} {e.rut ? `(${e.rut})` : ""}
                          </option>
                        ))}
                      </select>
                      {empresas.length === 0 ? (
                        <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                          No se pudo cargar la lista (puedes usar Persona natural o cargar endpoint).
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <label className="text-xs text-[var(--text-secondary)]">RUT (auto o manual)</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        placeholder="76.123.456-7"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="text-xs text-[var(--text-secondary)]">Nombre persona</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        value={empresaNombreManual}
                        onChange={(e) => setEmpresaNombreManual(e.target.value)}
                        placeholder="Nombre completo"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[var(--text-secondary)]">RUT</label>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        value={rut}
                        onChange={(e) => setRut(e.target.value)}
                        placeholder="12.345.678-9"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">Contacto</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={nombreContacto}
                      onChange={(e) => setNombreContacto(e.target.value)}
                      placeholder="Nombre contacto"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">Email</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@empresa.cl"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">Teléfono</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+56 9..."
                    />
                  </div>
                </div>

                {/* CRM: dirección + obra */}
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-[var(--text-secondary)]">Dirección (CRM)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Ej: Av. Apoquindo 1234, Las Condes"
                    />
                    <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                      * Se guarda en la cotización (snapshot) para que no dependas del cliente.
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-xs text-[var(--text-secondary)]">Nombre obra</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={nombreObra}
                      onChange={(e) => setNombreObra(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>
              </div>

              {/* Condiciones */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--hover)] p-4">
                <div className="text-xs font-semibold text-[var(--text-secondary)]">Condiciones</div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-[var(--text-secondary)]">% Ganancia (antes de IVA)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={gananciaPct}
                      onChange={(e) => setGananciaPct(e.target.value)}
                      inputMode="numeric"
                      placeholder="25"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs text-[var(--text-secondary)]">OC Cliente (Orden de compra)</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={ocCliente}
                      onChange={(e) => setOcCliente(e.target.value)}
                      placeholder="OC-12345"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs text-[var(--text-secondary)]">Observaciones</label>
                    <textarea
                      className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      placeholder="Notas internas..."
                    />
                  </div>
                </div>

                <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                  * IVA default se asume fijo en <b>{ivaDefaultPct}%</b> si el ítem no indica IVA.
                </div>

                {/* ✅ FLETE */}
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={tieneFlete}
                      onChange={(e) => setTieneFlete(e.target.checked)}
                      disabled={busy || !!fletesError}
                    />
                    <span className="font-medium">Incluir flete</span>
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      (Gratis si Santiago/RM y venta neta &gt; {money(UMBRAL_FLETE_GRATIS_NETO)})
                    </span>
                  </label>

                  {tieneFlete ? (
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="md:col-span-2">
                        <label className="text-xs text-[var(--text-secondary)]">Tarifa de flete</label>
                        <select
                          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                          value={fleteTarifaId}
                          onChange={(e) => setFleteTarifaId(e.target.value)}
                          disabled={busy || fletes.length === 0}
                        >
                          <option value="">Selecciona un flete...</option>
                          {fletes.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.nombre}
                              {f.zona ? ` · ${f.zona}` : ""}
                              {f.destino ? ` · ${f.destino}` : ""}
                              {` · ${money(f.precio ?? 0)}`}
                            </option>
                          ))}
                        </select>

                        {fletes.length === 0 ? (
                          <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                            No hay fletes activos en la base de datos.
                          </div>
                        ) : null}
                      </div>

                      <div className="md:col-span-1">
                        <label className="text-xs text-[var(--text-secondary)]">Preview</label>
                        <div className="mt-1 rounded-xl border border-[var(--border)] bg-[var(--hover)] px-3 py-2 text-sm">
                          {!selectedFlete ? (
                            <span className="text-[var(--text-secondary)]">Selecciona una tarifa…</span>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-xs text-[var(--text-secondary)]">
                                {selectedFlete.zona || "—"} · {selectedFlete.destino || "—"}
                              </div>

                              <div className="font-semibold">
                                {fletePreview?.gratis ? "Flete gratis ✅" : `Flete neto: ${money(fletePreview?.neto ?? 0)}`}
                              </div>

                              <div className="text-[11px] text-[var(--text-secondary)]">
                                IVA flete ({IVA_FLETE_PCT}%): <b>{money(fletePreview?.iva ?? 0)}</b> · Total flete:{" "}
                                <b>{money(fletePreview?.total ?? 0)}</b>
                              </div>

                              <div className="text-[11px] text-[var(--text-secondary)]">
                                {fletePreview?.esSantiago
                                  ? `Regla Santiago/RM aplicada (${money(calc.ventaNetaTotal)} neto).`
                                  : "No es Santiago/RM (se cobra tarifa)."}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Items */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--hover)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Productos</div>
                  <Button type="button" variant="secondary" onClick={addItem} disabled={busy} className="h-8 px-3 text-xs">
                    + Agregar ítem
                  </Button>
                </div>

                <div className="mt-3 space-y-3">
                  {items.map((it, idx) => {
                    const invRow = it.productoId ? findInv(it.productoId) : undefined;
                    const stock = invRow?.stock ?? 0;
                    const qty = Math.max(1, Math.trunc(Number(it.cantidad) || 1));
                    const overStock = canValidateStock && Boolean(it.productoId) && qty > stock;

                    const g = Number(gananciaPct);
                    const factor = Number.isFinite(g) ? 1 + g / 100 : 1;
                    const costo = Math.max(0, Math.round(Number(it.costoUnitarioNeto) || 0));
                    const precioVenta = Math.round(costo * factor);

                    const ivaGlobal = clampInt(toInt(ivaDefaultPct, 19), 0, 100);
                    const ivaPctItem = it.ivaPct.trim()
                      ? clampInt(toInt(it.ivaPct, ivaGlobal), 0, 100)
                      : ivaGlobal;

                    return (
                      <div key={idx} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-8">
                          <div className="md:col-span-3">
                            <label className="text-xs text-[var(--text-secondary)]">Producto</label>

                            <ProductComboBox
                              value={it.productoId}
                              options={inventario}
                              disabled={busy}
                              placeholder="Buscar y seleccionar..."
                              onChange={(productoId) => {
                                const row = findInv(productoId);
                                setItem(idx, {
                                  productoId,
                                  descripcion: row?.producto?.nombre ?? it.descripcion,
                                });
                              }}
                            />

                            {it.productoId && invRow ? (
                              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                                Stock disponible: <b>{stock}</b>
                                {invRow.producto?.unidadMedida ? ` — ${invRow.producto.unidadMedida}` : ""}
                                {invRow.producto?.sku ? ` — SKU: ${invRow.producto.sku}` : ""}
                              </div>
                            ) : null}
                          </div>

                          <div className="md:col-span-2">
                            <label className="text-xs text-[var(--text-secondary)]">Descripción</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                              value={it.descripcion}
                              onChange={(e) => setItem(idx, { descripcion: e.target.value })}
                              placeholder="Opcional"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-xs text-[var(--text-secondary)]">Cantidad</label>
                            <input
                              className={cn(
                                "mt-1 w-full rounded-xl border bg-[var(--surface)] px-3 py-2 text-sm",
                                overStock ? "border-rose-300" : "border-[var(--border)]"
                              )}
                              value={it.cantidad}
                              onChange={(e) => setItem(idx, { cantidad: e.target.value })}
                              inputMode="numeric"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-xs text-[var(--text-secondary)]">Costo unit. neto</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                              value={it.costoUnitarioNeto}
                              onChange={(e) => setItem(idx, { costoUnitarioNeto: e.target.value })}
                              inputMode="numeric"
                            />
                          </div>

                          <div className="md:col-span-1">
                            <label className="text-xs text-[var(--text-secondary)]">IVA ítem (%)</label>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                              value={it.ivaPct}
                              onChange={(e) => setItem(idx, { ivaPct: e.target.value })}
                              inputMode="numeric"
                              placeholder={`${calc.ivaGlobal}`}
                            />
                          </div>
                        </div>

                        {overStock ? (
                          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                            Cantidad supera stock disponible ({stock}).
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs text-[var(--text-secondary)]">
                            Precio venta neto (con ganancia):{" "}
                            <span className="font-semibold text-[var(--text-primary)]">{money(precioVenta)}</span>
                            <span className="ml-3">
                              IVA aplicado: <b>{ivaPctItem}%</b>
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => removeItem(idx)}
                            disabled={busy || items.length <= 1}
                            className="h-8 px-3 text-xs"
                            title={items.length <= 1 ? "Debe existir al menos 1 ítem" : "Eliminar ítem"}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totales + acciones */}
              <div className="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                  <div className="text-sm">
                    <div className="text-xs text-[var(--text-secondary)]">Costo total (neto)</div>
                    <div className="mt-1 font-semibold">{money(calc.costoTotal)}</div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-[var(--text-secondary)]">Ganancia</div>
                    <div className="mt-1 font-semibold">{money(calc.gananciaTotal)}</div>
                  </div>

                  <div className="text-sm">
                    <div className="text-xs text-[var(--text-secondary)]">Venta neta (con ganancia)</div>
                    <div className="mt-1 font-semibold">{money(calc.ventaNetaTotal)}</div>
                  </div>

                  {/* ✅ IVA FINAL (productos + flete) */}
                  <div className="text-sm">
                    <div className="text-xs text-[var(--text-secondary)]">IVA</div>
                    <div className="mt-1 font-semibold">{money(calc.ivaFinal)}</div>
                  </div>

                  {/* ✅ TOTAL FINAL (productos + flete) */}
                  <div className="text-sm">
                    <div className="text-xs text-[var(--text-secondary)]">Total</div>
                    <div className="mt-1 font-semibold">{money(calc.totalFinal)}</div>
                  </div>
                </div>

                {/* ✅ línea informativa de flete */}
                {tieneFlete && selectedFlete ? (
                  <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                    Flete: {money(calc.fleteNeto)} + IVA {money(calc.fleteIva)} = <b>{money(calc.fleteTotal)}</b>
                  </div>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="w-full sm:w-auto">
                    Cancelar
                  </Button>

                  <Button type="submit" disabled={submitDisabled} className="w-full sm:w-auto" title={submitTitle}>
                    {busy ? "Guardando..." : "Crear cotización"}
                  </Button>
                </div>

                <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                  *{" "}
                  {canValidateStock
                    ? "Bloquea creación si la cantidad supera stock. (Igual valida en backend para seguridad)"
                    : "Inventario no disponible: no se validará stock aquí (igual se valida en backend)."}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
