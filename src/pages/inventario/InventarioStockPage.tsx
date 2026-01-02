// InventarioStockPage.tsx (ACTUALIZADO COMPLETO)
// ✅ múltiples imágenes (upload field "fotos")
// ✅ consumo producto.imagenes[] + fotoUrl legacy
// ✅ tabla muestra miniatura + badge +N
// ✅ al click en un producto abre "Detalle" con galería estilo portal inmobiliario (thumbs izquierda + imagen grande)
// ✅ navegación: click thumbs, botones prev/next, teclado (← →, Esc)

import {
  Pencil,
  Plus,
  X,
  Search,
  Loader2,
  Upload,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Button from "../../components/ui/Button";

/* =========================
   Types
========================= */

type ProductoTipo = "Producto";

type ApiErrorBody = {
  message?: string;
  error?: string;
  issues?: Array<{ path?: Array<string | number>; message?: string }>;
};

type ApiError = Error & {
  status?: number;
  body?: ApiErrorBody;
};

function isApiError(e: unknown): e is ApiError {
  return e instanceof Error;
}

type ApiProductoImagen = {
  id: string;
  url: string;
  publicId: string;
  orden: number;
  createdAt: string;
};

type ApiProducto = {
  id: string;
  sku: string | null;
  nombre: string;
  unidadMedida: string;

  // principal (compat)
  fotoUrl: string | null;

  // ✅ galería
  imagenes?: ApiProductoImagen[];

  tipo: ProductoTipo;
  precioGeneral: number;
  precioConDescto: number;
  createdAt: string;
  updatedAt: string;
};

type ApiInventario = {
  id: string;
  productoId: string;
  codigo: string | null;
  stock: number;
  minimo: number;
  ubicacion: string | null;
  createdAt: string;
  updatedAt: string;
  producto?: ApiProducto;
};

type StockRow = {
  inventarioId: string;
  productoId: string;
  codigo: string;
  sku: string;
  producto: string;
  tipo: ProductoTipo;

  // ✅ consumo
  foto?: string; // imagen principal para tabla
  imagenes?: ApiProductoImagen[]; // galería completa

  precio: number;
  stock: number;
  minimo: number;
};

type StockRowDraft = {
  skuNum: string;
  invNum: string;
  producto: string;
  tipo: ProductoTipo;
  precio: string;
  stock: string;
  minimo: string;
};

type DialogMode = "create" | "edit";

type ImportResponse = {
  ok?: boolean;
  message?: string;
  total?: number;
  createdProductos?: number;
  updatedProductos?: number;
  createdInventarios?: number;
  updatedInventarios?: number;
  errores?: Array<{ row: number; error: string }>;
};

/* =========================
   API helpers
========================= */

function normalizeApiBaseUrl(raw: string) {
  const s = raw.replace(/\/+$/, "");
  return s.endsWith("/api") ? s : `${s}/api`;
}

const RAW_API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:3000";
const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

function getAuthToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("auth_token")
  );
}

function buildAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function readResponseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function formatZodIssues(issues?: ApiErrorBody["issues"]) {
  if (!issues?.length) return "";
  return issues
    .map((i) => `${(i.path?.join(".") || "campo")}: ${i.message || "inválido"}`)
    .join(" | ");
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const bodyRaw = (await readResponseBody(res)) as unknown;
    const body = (bodyRaw && typeof bodyRaw === "object" ? bodyRaw : null) as ApiErrorBody | null;

    const msg =
      body?.error ||
      body?.message ||
      (typeof bodyRaw === "string" ? bodyRaw : null) ||
      `Error HTTP ${res.status}`;

    const err: ApiError = new Error(msg);
    err.status = res.status;
    err.body = body ?? undefined;
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const parsed = await readResponseBody(res);
  return parsed as T;
}

async function apiUploadForm<T>(
  path: string,
  formData: FormData,
  method: "POST" | "PATCH" = "POST",
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...buildAuthHeaders(),
    },
    body: formData,
  });

  if (!res.ok) {
    const bodyRaw = (await readResponseBody(res)) as unknown;
    const body = (bodyRaw && typeof bodyRaw === "object" ? bodyRaw : null) as ApiErrorBody | null;

    const msg =
      body?.error ||
      body?.message ||
      (typeof bodyRaw === "string" ? bodyRaw : null) ||
      `Error HTTP ${res.status}`;

    const err: ApiError = new Error(msg);
    err.status = res.status;
    err.body = body ?? undefined;
    throw err;
  }

  if (res.status === 204) return undefined as T;

  const parsed = await readResponseBody(res);
  return parsed as T;
}

function errorMessage(e: unknown, fallback: string) {
  if (!isApiError(e)) return fallback;
  return e.body?.error || e.body?.message || e.message || fallback;
}

/* =========================
   SKU/INV helpers
========================= */

function onlyDigits(s: string) {
  return s.replace(/\D+/g, "");
}
function pad3(n: string) {
  const d = onlyDigits(n);
  if (!d) return "";
  return d.padStart(3, "0");
}
function makeSKU(num: string) {
  const p = pad3(num);
  return p ? `SKU-${p}` : "";
}
function makeINV(num: string) {
  const p = pad3(num);
  return p ? `INV-${p}` : "";
}
function extractNumFromPrefixed(value: string | null | undefined, prefix: "SKU-" | "INV-") {
  const v = (value ?? "").toUpperCase().trim();
  if (!v) return "";
  if (v.startsWith(prefix)) return onlyDigits(v.slice(prefix.length));
  return onlyDigits(v);
}

/* =========================
   UI helpers
========================= */

function toDraft(row?: StockRow): StockRowDraft {
  return {
    skuNum: extractNumFromPrefixed(row?.sku, "SKU-"),
    invNum: extractNumFromPrefixed(row?.codigo, "INV-"),
    producto: row?.producto ?? "",
    tipo: row?.tipo ?? "Producto",
    precio: row ? String(row.precio) : "",
    stock: row ? String(row.stock) : "",
    minimo: row ? String(row.minimo) : "",
  };
}

function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function parseNonNegativeInteger(value: string) {
  const parsed = parseNonNegativeNumber(value);
  if (parsed === null || !Number.isInteger(parsed)) return null;
  return parsed;
}

function pickPrimaryImage(producto?: ApiProducto): string | undefined {
  const imgs = (producto?.imagenes ?? []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  return imgs[0]?.url ?? (producto?.fotoUrl ?? undefined);
}

function mapApiToRows(items: ApiInventario[]): StockRow[] {
  return items
    .filter((inv) => Boolean(inv.producto))
    .map((inv) => ({
      inventarioId: inv.id,
      productoId: inv.productoId,
      codigo: inv.codigo ?? "",
      sku: inv.producto?.sku ?? "",
      producto: inv.producto?.nombre ?? "",
      tipo: inv.producto?.tipo ?? "Producto",
      foto: pickPrimaryImage(inv.producto),
      imagenes: inv.producto?.imagenes ?? [],
      precio: inv.producto?.precioGeneral ?? 0,
      stock: inv.stock ?? 0,
      minimo: inv.minimo ?? 0,
    }));
}

function isExcelFile(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function buildGallery(row: StockRow) {
  const fromImagenes = (row.imagenes ?? [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((img) => ({
      key: img.id || img.publicId || img.url,
      url: img.url,
      label: "Imagen",
    }));

  const legacy = row.foto ? [{ key: `legacy-${row.productoId}`, url: row.foto, label: "Principal" }] : [];

  // si legacy ya está en imagenes, evita duplicado
  const seen = new Set<string>();
  const out: Array<{ key: string; url: string; label: string }> = [];
  for (const it of [...fromImagenes, ...legacy]) {
    if (!it.url) continue;
    if (seen.has(it.url)) continue;
    seen.add(it.url);
    out.push(it);
  }
  return out;
}

/* =========================
   Detail Modal (galería tipo portal)
========================= */

function ProductDetailModal({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: StockRow | null;
  onClose: () => void;
}) {
  const gallery = useMemo(() => (row ? buildGallery(row) : []), [row]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, row?.productoId]);

  const canPrev = index > 0;
  const canNext = index < gallery.length - 1;

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }
  function next() {
    setIndex((i) => Math.min(gallery.length - 1, i + 1));
  }

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gallery.length, index, onClose]);

  if (!open || !row) return null;

  const active = gallery[index];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[var(--overlay)]" onClick={onClose} aria-label="Cerrar" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.producto}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <span className="rounded-lg bg-[var(--hover)] px-2 py-0.5 font-semibold">{row.sku || "—"}</span>
              <span className="rounded-lg bg-[var(--hover)] px-2 py-0.5 font-semibold">{row.codigo || "—"}</span>
              <span className="rounded-lg bg-[var(--hover)] px-2 py-0.5 font-semibold">{row.tipo}</span>
            </div>
          </div>

          <Button variant="secondary" size="icon" onClick={onClose} aria-label="Cerrar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* body */}
        <div className="grid gap-0 md:grid-cols-[120px_1fr]">
          {/* thumbs */}
          <div className="hidden max-h-[72vh] overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-3 md:block">
            <div className="flex flex-col gap-2">
              {gallery.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] p-3 text-center text-[11px] text-[var(--text-secondary)]">
                  Sin imágenes
                </div>
              ) : (
                gallery.map((img, i) => {
                  const selected = i === index;
                  return (
                    <button
                      type="button"
                      key={img.key}
                      onClick={() => setIndex(i)}
                      className={
                        selected
                          ? "rounded-xl border-2 border-[var(--primary)] p-0.5"
                          : "rounded-xl border border-[var(--border)] p-0.5 hover:border-[var(--primary)]"
                      }
                      aria-label={`Ver imagen ${i + 1}`}
                    >
                      <img
                        src={img.url}
                        alt={`Miniatura ${i + 1}`}
                        className="h-20 w-full rounded-lg object-cover"
                        loading="lazy"
                      />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* main image */}
          <div className="relative bg-black/5">
            <div className="flex max-h-[72vh] min-h-[360px] items-center justify-center p-3">
              {active?.url ? (
                <img
                  src={active.url}
                  alt={`Imagen ${index + 1} de ${row.producto}`}
                  className="max-h-[70vh] w-full rounded-2xl border border-[var(--border)] object-contain bg-white"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-[360px] w-full items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--hover)] text-sm text-[var(--text-secondary)]">
                  Sin imágenes para mostrar
                </div>
              )}
            </div>

            {/* controls */}
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={prev}
                  disabled={!canPrev}
                  className={
                    canPrev
                      ? "absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                      : "absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/60 p-2 opacity-50"
                  }
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className={
                    canNext
                      ? "absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white"
                      : "absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/60 p-2 opacity-50"
                  }
                  aria-label="Siguiente"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-[11px] font-semibold text-white">
                  {index + 1} / {gallery.length}
                </div>
              </>
            ) : null}

            {/* mobile thumbs */}
            {gallery.length > 1 ? (
              <div className="md:hidden border-t border-[var(--border)] bg-[var(--surface)] px-3 py-3">
                <div className="flex gap-2 overflow-x-auto">
                  {gallery.map((img, i) => {
                    const selected = i === index;
                    return (
                      <button
                        type="button"
                        key={img.key}
                        onClick={() => setIndex(i)}
                        className={
                          selected
                            ? "shrink-0 rounded-xl border-2 border-[var(--primary)] p-0.5"
                            : "shrink-0 rounded-xl border border-[var(--border)] p-0.5"
                        }
                        aria-label={`Ver imagen ${i + 1}`}
                      >
                        <img src={img.url} alt={`Miniatura ${i + 1}`} className="h-16 w-20 rounded-lg object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* footer info */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-[var(--hover)] px-3 py-2">
              <div className="text-[11px] text-[var(--text-secondary)]">Precio</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
                  row.precio,
                )}
              </div>
            </div>
            <div className="rounded-xl bg-[var(--hover)] px-3 py-2">
              <div className="text-[11px] text-[var(--text-secondary)]">Stock</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{row.stock}</div>
            </div>
            <div className="rounded-xl bg-[var(--hover)] px-3 py-2">
              <div className="text-[11px] text-[var(--text-secondary)]">Mínimo</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">{row.minimo}</div>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
            Tip: usa <b>←</b> <b>→</b> para navegar y <b>Esc</b> para cerrar.
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Component
========================= */

export default function InventarioStockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");

  const [dialogMode, setDialogMode] = useState<DialogMode>("create");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInventarioId, setEditingInventarioId] = useState<string | null>(null);

  const [draft, setDraft] = useState<StockRowDraft>(() => toDraft());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ múltiples fotos (archivos) + previews
  const fotosInputRef = useRef<HTMLInputElement | null>(null);
  const [fotoFiles, setFotoFiles] = useState<File[]>([]);
  const [fotoPreviews, setFotoPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<ApiProductoImagen[]>([]);

  // ✅ detalle producto (galería)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<StockRow | null>(null);

  // Excel import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // eliminar
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const money = useMemo(
    () =>
      new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      }),
    [],
  );

  // cleanup previews
  useEffect(() => {
    return () => {
      fotoPreviews.forEach((p) => {
        if (p.startsWith("blob:")) URL.revokeObjectURL(p);
      });
    };
  }, [fotoPreviews]);

  async function refresh(q?: string) {
    try {
      if (!mountedRef.current) return;

      setLoading(true);
      setLoadError(null);

      const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const data = await apiFetch<ApiInventario[]>(`/inventario${qs}`);

      if (mountedRef.current) setRows(mapApiToRows(data));
    } catch (e: unknown) {
      console.error(e);
      if (mountedRef.current) setLoadError(errorMessage(e, "Error al cargar inventario"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  function resetFotosState() {
    fotoPreviews.forEach((p) => {
      if (p.startsWith("blob:")) URL.revokeObjectURL(p);
    });
    setFotoFiles([]);
    setFotoPreviews([]);
    if (fotosInputRef.current) fotosInputRef.current.value = "";
  }

  function openCreateDialog() {
    setDialogMode("create");
    setEditingInventarioId(null);
    setDraft(toDraft());
    setFormError(null);
    setExistingImages([]);
    resetFotosState();
    setDialogOpen(true);
  }

  function openEditDialog(row: StockRow) {
    setDialogMode("edit");
    setEditingInventarioId(row.inventarioId);
    setDraft(toDraft(row));
    setFormError(null);
    setExistingImages(row.imagenes ?? []);
    resetFotosState();
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) return;
    setDialogOpen(false);
  }

  function openDetail(row: StockRow) {
    setDetailRow(row);
    setDetailOpen(true);
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetailRow(null);
  }

  function validateDraft() {
    const sku = makeSKU(draft.skuNum);
    const codigo = makeINV(draft.invNum);

    const producto = draft.producto.trim();
    const precio = parseNonNegativeNumber(draft.precio);
    const stock = parseNonNegativeInteger(draft.stock);
    const minimo = parseNonNegativeInteger(draft.minimo);

    if (!draft.skuNum.trim()) return { ok: false as const, message: "El N° SKU es obligatorio." };
    if (!sku) return { ok: false as const, message: "SKU inválido." };

    if (!producto) return { ok: false as const, message: "El nombre del producto es obligatorio." };
    if (precio === null) return { ok: false as const, message: "El precio debe ser un número ≥ 0." };

    const editingProductoId =
      dialogMode === "edit"
        ? rows.find((r) => r.inventarioId === editingInventarioId)?.productoId
        : null;

    const skuLower = sku.toLowerCase();
    const skuInUse = rows.some((row) => {
      if (dialogMode === "edit" && editingProductoId && row.productoId === editingProductoId) return false;
      return (row.sku ?? "").toLowerCase() === skuLower;
    });
    if (skuInUse) return { ok: false as const, message: "Ya existe un producto con ese SKU." };

    if (!draft.invNum.trim()) return { ok: false as const, message: "El N° INV es obligatorio." };
    if (!codigo) return { ok: false as const, message: "INV inválido." };
    if (stock === null) return { ok: false as const, message: "El stock debe ser un entero ≥ 0." };
    if (minimo === null) return { ok: false as const, message: "El mínimo debe ser un entero ≥ 0." };

    return {
      ok: true as const,
      value: {
        codigo,
        sku,
        producto,
        tipo: "Producto" as const,
        precio: Math.trunc(precio),
        stock: Math.trunc(stock),
        minimo: Math.trunc(minimo),
      },
    };
  }

  function handlePickFotos() {
    fotosInputRef.current?.click();
  }

  function removeSelectedFoto(index: number) {
    setFotoFiles((prev) => prev.filter((_, i) => i !== index));
    setFotoPreviews((prev) => {
      const p = prev[index];
      if (p && p.startsWith("blob:")) URL.revokeObjectURL(p);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const v = validateDraft();
    if (!v.ok) {
      setFormError(v.message);
      return;
    }

    setSaving(true);
    let shouldClose = false;

    try {
      if (dialogMode === "create") {
        const form = new FormData();
        form.append("sku", v.value.sku);
        form.append("nombre", v.value.producto);
        form.append("unidadMedida", "unidad");
        form.append("tipo", v.value.tipo);
        form.append("precioGeneral", String(v.value.precio));
        form.append("precioConDescto", String(v.value.precio));
        fotoFiles.forEach((f) => form.append("fotos", f));

        const createdProducto = await apiUploadForm<ApiProducto>("/productos", form, "POST");

        await apiFetch<ApiInventario>("/inventario", {
          method: "POST",
          body: JSON.stringify({
            productoId: createdProducto.id,
            codigo: v.value.codigo,
            stock: v.value.stock,
            minimo: v.value.minimo,
          }),
        });

        shouldClose = true;
      } else {
        if (!editingInventarioId) {
          setFormError("No se encontró el inventario a editar.");
          return;
        }

        const current = rows.find((r) => r.inventarioId === editingInventarioId);
        if (!current) {
          setFormError("No se encontró el registro actual.");
          return;
        }

        const form = new FormData();
        form.append("sku", v.value.sku);
        form.append("nombre", v.value.producto);
        form.append("tipo", v.value.tipo);
        form.append("precioGeneral", String(v.value.precio));
        form.append("precioConDescto", String(v.value.precio));
        fotoFiles.forEach((f) => form.append("fotos", f));

        await apiUploadForm<ApiProducto>(`/productos/${current.productoId}`, form, "PATCH");
        shouldClose = true;
      }
    } catch (e: unknown) {
      console.error(e);
      if (isApiError(e) && e.body?.issues?.length) {
        const details = formatZodIssues(e.body.issues);
        setFormError(`${errorMessage(e, "No se pudo guardar.")} — ${details}`);
      } else {
        setFormError(errorMessage(e, "No se pudo guardar. Revisa los datos."));
      }
    } finally {
      setSaving(false);
      if (shouldClose) {
        closeDialog();
        resetFotosState();
        await refresh(query);
      }
    }
  }

  async function handleDeleteRow(row: StockRow) {
    const ok = window.confirm(`¿Eliminar "${row.producto}"?\n\nEsto borrará el inventario y luego el producto.`);
    if (!ok) return;

    setDeletingId(row.inventarioId);

    try {
      await apiFetch<void>(`/inventario/${row.inventarioId}`, { method: "DELETE" });

      try {
        await apiFetch<void>(`/productos/${row.productoId}`, { method: "DELETE" });
      } catch (e2) {
        console.warn("No se pudo borrar producto (quizá tiene referencias):", e2);
      }

      await refresh(query);
    } catch (e: unknown) {
      console.error(e);
      setLoadError(errorMessage(e, "No se pudo eliminar."));
    } finally {
      setDeletingId(null);
    }
  }

  function openFilePicker() {
    if (importing) return;
    setImportError(null);
    setImportResult(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(file: File) {
    if (!isExcelFile(file)) {
      setImportError("Archivo inválido. Sube un .xlsx o .xls");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const result = await apiUploadForm<ImportResponse>("/inventario/import-excel", form, "POST");

      if (result && typeof result === "object" && "ok" in result && result.ok === false) {
        setImportError(result.message || "La importación devolvió errores.");
        setImportResult(result);
      } else {
        setImportResult(result);
      }

      await refresh(query);
    } catch (e: unknown) {
      console.error(e);
      setImportError(errorMessage(e, "No se pudo importar el Excel."));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const skuPreview = makeSKU(draft.skuNum) || "SKU-000";
  const invPreview = makeINV(draft.invNum) || "INV-000";

  return (
    <>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold">Stock y alertas</div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Buscar por nombre o SKU..."
              />
            </div>

            <Button variant="secondary" onClick={() => void refresh(query)} className="px-3" disabled={loading || importing}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
            </Button>

            {/* Import Excel */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
              }}
            />

            <Button
              variant="secondary"
              onClick={openFilePicker}
              className="px-3"
              disabled={importing || loading}
              title="Subir un archivo Excel (.xlsx/.xls)"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? "Importando..." : "Importar Excel"}
            </Button>

            <Button variant="secondary" onClick={openCreateDialog} className="px-3" disabled={importing}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Agregar
            </Button>
          </div>
        </div>

        {importError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {importError}
          </div>
        ) : null}

        {importResult ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <div className="font-semibold">Importación lista</div>
            <div className="mt-1 text-[13px]">
              {importResult.message ? <div>{importResult.message}</div> : null}
              {typeof importResult.total === "number" ? <div>Total filas: {importResult.total}</div> : null}
              {typeof importResult.createdProductos === "number" ? <div>Productos creados: {importResult.createdProductos}</div> : null}
              {typeof importResult.updatedProductos === "number" ? <div>Productos actualizados: {importResult.updatedProductos}</div> : null}
              {typeof importResult.createdInventarios === "number" ? <div>Inventarios creados: {importResult.createdInventarios}</div> : null}
              {typeof importResult.updatedInventarios === "number" ? <div>Inventarios actualizados: {importResult.updatedInventarios}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
          {loadError ? <div className="p-4 text-sm text-rose-700">{loadError}</div> : null}

          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-[var(--hover)] text-xs font-medium text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2">Foto</th>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Mínimo</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-[var(--text-secondary)]" colSpan={9}>
                    Cargando...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-[var(--text-secondary)]" colSpan={9}>
                    Sin registros.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const low = row.stock < row.minimo;
                  const deleting = deletingId === row.inventarioId;
                  const galleryCount = buildGallery(row).length;
                  const extraCount = Math.max(0, galleryCount - 1);

                  return (
                    <tr key={row.inventarioId} className="bg-[var(--surface)]">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="relative inline-flex"
                          onClick={() => openDetail(row)}
                          title="Ver detalle"
                        >
                          {row.foto ? (
                            <img
                              src={row.foto}
                              alt={`Foto de ${row.producto}`}
                              className="h-10 w-10 rounded-xl border border-[var(--border)] object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--hover)] text-[10px] font-medium uppercase text-[var(--text-secondary)]">
                              Sin foto
                            </div>
                          )}

                          {extraCount > 0 ? (
                            <span className="absolute -right-2 -top-2 rounded-full bg-[var(--primary)] px-2 py-0.5 text-[10px] font-semibold text-white">
                              +{extraCount}
                            </span>
                          ) : null}
                        </button>
                      </td>

                      <td className="px-3 py-2">{row.codigo || "—"}</td>
                      <td className="px-3 py-2">{row.sku || "—"}</td>

                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openDetail(row)}
                          className="text-left font-medium text-[var(--text-primary)] hover:underline"
                          title="Abrir detalle"
                        >
                          {row.producto}
                        </button>
                        <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                          {galleryCount > 0 ? `${galleryCount} imagen(es)` : "Sin imágenes"}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <span className="rounded-lg bg-[var(--hover)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          {row.tipo}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-right tabular-nums">{money.format(row.precio)}</td>

                      <td className="px-3 py-2">
                        <span
                          className={
                            low
                              ? "rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              : "rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                          }
                        >
                          {row.stock}
                        </span>
                      </td>

                      <td className="px-3 py-2">{row.minimo}</td>

                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => openEditDialog(row)}
                            aria-label={`Editar ${row.producto}`}
                            disabled={deleting}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>

                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => void handleDeleteRow(row)}
                            aria-label={`Eliminar ${row.producto}`}
                            disabled={deleting}
                            title="Eliminar"
                          >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dialog Create/Edit */}
        {dialogOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <button type="button" className="absolute inset-0 bg-[var(--overlay)]" onClick={closeDialog} aria-label="Cerrar" />
            <div className="relative w-full max-w-xl rounded-2xl bg-[var(--surface)] p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">{dialogMode === "create" ? "Agregar" : "Modificar"}</div>
                <Button variant="secondary" size="icon" onClick={closeDialog} aria-label="Cerrar" disabled={saving}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">N° SKU</div>
                    <input
                      value={draft.skuNum}
                      onChange={(e) => setDraft((c) => ({ ...c, skuNum: onlyDigits(e.target.value) }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="Ej: 12"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      disabled={saving}
                    />
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Se guardará como: <b>{skuPreview}</b>
                    </div>
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">Precio (General)</div>
                    <input
                      value={draft.precio}
                      onChange={(event) => setDraft((c) => ({ ...c, precio: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="0"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      step={1}
                      required
                      disabled={saving}
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">Tipo</div>
                    <select
                      value={draft.tipo}
                      onChange={(e) => setDraft((c) => ({ ...c, tipo: e.target.value as ProductoTipo }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      disabled={saving}
                    >
                      <option value="Producto">Producto</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">N° INV</div>
                    <input
                      value={draft.invNum}
                      onChange={(e) => setDraft((c) => ({ ...c, invNum: onlyDigits(e.target.value) }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="Ej: 12"
                      inputMode="numeric"
                      autoComplete="off"
                      required
                      disabled={saving}
                    />
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Se guardará como: <b>{invPreview}</b>
                    </div>
                  </label>
                </div>

                <label className="space-y-1">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Producto</div>
                  <input
                    value={draft.producto}
                    onChange={(event) => setDraft((c) => ({ ...c, producto: event.target.value }))}
                    className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Nombre del producto"
                    autoComplete="off"
                    required
                    disabled={saving}
                  />
                </label>

                {/* FOTOS múltiples */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[var(--text-primary)]">Imágenes (puedes subir varias)</div>

                  <input
                    ref={fotosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;

                      const bad = files.find((f) => !isImageFile(f));
                      if (bad) {
                        setFormError("Uno de los archivos no es una imagen válida (jpg/png/webp).");
                        if (fotosInputRef.current) fotosInputRef.current.value = "";
                        return;
                      }

                      setFormError(null);
                      setFotoFiles((prev) => [...prev, ...files]);
                      setFotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);

                      if (fotosInputRef.current) fotosInputRef.current.value = "";
                    }}
                    disabled={saving}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" onClick={handlePickFotos} disabled={saving}>
                      <ImageIcon className="h-4 w-4" />
                      Elegir imágenes
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={resetFotosState}
                      disabled={saving || (fotoFiles.length === 0 && fotoPreviews.length === 0)}
                    >
                      Quitar selección
                    </Button>

                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Se suben a Cloudinary al guardar (field <b>fotos</b>).
                    </div>
                  </div>

                  {dialogMode === "edit" && existingImages.length > 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--hover)] p-2">
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        Imágenes actuales ({existingImages.length})
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {existingImages
                          .slice()
                          .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                          .map((img) => (
                            <img
                              key={img.id}
                              src={img.url}
                              alt="Imagen producto"
                              className="h-12 w-12 rounded-xl border border-[var(--border)] object-cover"
                              loading="lazy"
                            />
                          ))}
                      </div>
                      <div className="mt-2 text-[11px] text-[var(--text-secondary)]">
                        (Opcional) Para borrar una imagen específica: <b>DELETE /productos/:id/imagenes/:imageId</b>
                      </div>
                    </div>
                  ) : null}

                  {fotoPreviews.length > 0 ? (
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--hover)] p-2">
                      <div className="text-[11px] font-semibold text-[var(--text-secondary)]">
                        Imágenes nuevas ({fotoPreviews.length})
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {fotoPreviews.map((src, idx) => (
                          <div key={`${src}-${idx}`} className="relative">
                            <img
                              src={src}
                              alt="Preview"
                              className="h-12 w-12 rounded-xl border border-[var(--border)] object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeSelectedFoto(idx)}
                              className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white shadow"
                              title="Quitar"
                              aria-label="Quitar imagen"
                              disabled={saving}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">Stock</div>
                    <input
                      value={draft.stock}
                      onChange={(event) => setDraft((c) => ({ ...c, stock: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="0"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      step={1}
                      required
                      disabled={saving}
                    />
                  </label>

                  <label className="space-y-1">
                    <div className="text-xs font-medium text-[var(--text-primary)]">Mínimo</div>
                    <input
                      value={draft.minimo}
                      onChange={(event) => setDraft((c) => ({ ...c, minimo: event.target.value }))}
                      className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm shadow-sm focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      placeholder="0"
                      inputMode="numeric"
                      type="number"
                      min={0}
                      step={1}
                      required
                      disabled={saving}
                    />
                  </label>
                </div>

                {formError ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                    {formError}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={closeDialog} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? "Guardando..." : dialogMode === "create" ? "Agregar" : "Guardar"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>

      {/* ✅ Detalle con galería tipo portal */}
      <ProductDetailModal open={detailOpen} row={detailRow} onClose={closeDetail} />
    </>
  );
}
