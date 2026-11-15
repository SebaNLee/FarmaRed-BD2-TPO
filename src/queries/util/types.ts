import type { MovimientoStock } from "../../models/stock-movimiento.js";
import type { MedioPago } from "../../models/venta.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";
import type { Receta } from "../../models/receta.js";

export type ItemVentaInput = {
  productoId: string;
  cantidad: number;
};

export type RegistrarVentaInput = {
  ventaId?: string;
  clienteId: string;
  farmaceuticoId: string;
  recetaId?: string | null;
  medioPago: MedioPago;
  items: ItemVentaInput[];
};

export type FaltanteStock = {
  productoId: string;
  solicitado: number;
  disponible: number;
};

export type ResultadoVenta =
  | { ok: true; venta: VentaConDetalles; idempotente: boolean }
  | {
      ok: false;
      codigo: "VALIDACION" | "STOCK_INSUFICIENTE" | "CONFLICTO" | "ERROR_INTERNO";
      errores: string[];
      faltantes?: FaltanteStock[];
    }
  | { ok: false; codigo: "INDETERMINADO"; ventaId: string; detalle: string };

export type ResultadoStock =
  | { ok: true; ventaId: string; movimientos: MovimientoStock[]; yaAplicado: boolean }
  | {
      ok: false;
      codigo: "VALIDACION" | "STOCK_INSUFICIENTE" | "CONFLICTO" | "ERROR_INTERNO";
      errores: string[];
      faltantes?: FaltanteStock[];
    }
  | { ok: false; codigo: "INDETERMINADO"; ventaId: string; detalle: string };

export type VentaPreparada = {
  ventaId: string;
  venta: VentaConDetalles;
  sucursalId: string;
  recetaAntes: Receta | null;
  recetaDespues: Receta | null;
};
