import type { DetalleVenta } from "./detalle-venta.js";
import type { Venta } from "./venta.js";

export type VentaConDetalles = Venta & {
  detalles: DetalleVenta[];
};
