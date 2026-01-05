import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import AppShell from "./layout/AppShell";

import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";

import CobranzaLayout from "./pages/cobranza/CobranzaLayout";
import CarteraPage from "./pages/cobranza/CarteraPage";
import CobranzaPagosPage from "./pages/cobranza/CobranzaPagosPage";
import CreditosPage from "./pages/cobranza/CreditosPage";

import ConciliacionPage from "./pages/ConciliacionPage";
import ConfiguracionPage from "./pages/ConfiguracionPage";
import ClientesPage from "./pages/ClientesPage";

import DocumentosLayout from "./pages/documentos/DocumentosLayout";
import CotizacionesPage from "./pages/documentos/CotizacionesPage";
import CotizacionesListPage from "./pages/documentos/CotizacionesListPage";
import FacturasPage from "./pages/documentos/FacturasPage";
import CotizacionWebPage from "./pages/CotizacionWebPage";
import CrmCotizacionesPage from "./pages/crm/CrmCotizacionesPage";
import CrmCotizacionDetailPage from "./pages/crm/CrmCotizacionDetailPage";

import InventarioLayout from "./pages/inventario/InventarioLayout";
import InventarioMovimientosPage from "./pages/inventario/InventarioMovimientosPage";
import InventarioRankingPage from "./pages/inventario/InventarioRankingPage";
import InventarioStockPage from "./pages/inventario/InventarioStockPage";

import NotFoundPage from "./pages/NotFoundPage";
import PagosPage from "./pages/PagosPage";
import TrabajadoresPage from "./pages/TrabajadoresPage";

import VentasLayout from "./pages/ventas/VentasLayout";
import CrecimientoVentasPage from "./pages/ventas/CrecimientoVentasPage";
import VentasDiariasPage from "./pages/ventas/VentasDiariasPage";
import VentasMensualPage from "./pages/ventas/VentasMensualPage";
import VentasPorVendedorPage from "./pages/ventas/VentasPorVendedorPage";

// ✅ Fletes (layout + tabs)
import FletesLayout from "./pages/fletes/FletesLayout";
import FletesPage from "./pages/fletes/FletesPage";
import FletesEstadoPage from "./pages/fletes/FletesEstadoPage";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="ventas" element={<VentasLayout />}>
          <Route index element={<Navigate to="diarias" replace />} />
          <Route path="diarias" element={<VentasDiariasPage />} />
          <Route path="por-vendedor" element={<VentasPorVendedorPage />} />
          <Route path="mensual" element={<VentasMensualPage />} />
          <Route path="crecimiento" element={<CrecimientoVentasPage />} />
        </Route>

        <Route path="cobranza" element={<CobranzaLayout />}>
          <Route index element={<Navigate to="cartera" replace />} />
          <Route path="cartera" element={<CarteraPage />} />
          <Route path="pagos" element={<CobranzaPagosPage />} />
          <Route path="creditos" element={<CreditosPage />} />
        </Route>

        <Route path="clientes" element={<ClientesPage />} />
        <Route path="trabajadores" element={<TrabajadoresPage />} />

        <Route path="inventario" element={<InventarioLayout />}>
          <Route index element={<Navigate to="stock" replace />} />
          <Route path="stock" element={<InventarioStockPage />} />
          <Route path="movimientos" element={<InventarioMovimientosPage />} />
          <Route path="ranking" element={<InventarioRankingPage />} />
        </Route>

        {/* ✅ DOCUMENTOS */}
        <Route path="documentos" element={<DocumentosLayout />}>
          <Route index element={<Navigate to="cotizaciones" replace />} />

          {/* ✅ Principal: CotizacionesPage */}
          <Route path="cotizaciones" element={<CotizacionesPage />} />

          {/* ✅ Reemplaza "nota de ventas": listado tabla */}
          <Route path="notas-venta" element={<CotizacionesListPage />} />

          <Route path="facturas" element={<FacturasPage />} />
        </Route>

        <Route path="cotizaciones" element={<CrmCotizacionesPage />} />
        <Route path="cotizaciones/:id" element={<CrmCotizacionDetailPage />} />

        <Route path="cotizacion-web" element={<CotizacionWebPage />} />

        <Route path="conciliacion" element={<ConciliacionPage />} />
        <Route path="pagos" element={<PagosPage />} />
        <Route path="configuracion" element={<ConfiguracionPage />} />

        {/* ✅ Fletes con pestañas */}
        <Route path="fletes" element={<FletesLayout />}>
          <Route index element={<FletesPage />} />
          <Route path="estado" element={<FletesEstadoPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
