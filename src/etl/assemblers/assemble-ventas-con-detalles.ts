import type { DetalleVenta } from "../../models/detalle-venta.js";
import type { Venta } from "../../models/venta.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";

/** Groups every sale detail under its corresponding sale. */
export function assembleVentasConDetalles(ventas: Venta[], detallesVenta: DetalleVenta[]): VentaConDetalles[] {
  const detallesPorVenta = new Map<string, DetalleVenta[]>();

  for (const detalle of detallesVenta) {
    const detalles = detallesPorVenta.get(detalle.ventaId) ?? [];
    detalles.push(detalle);
    detallesPorVenta.set(detalle.ventaId, detalles);
  }

  return ventas.map((venta) => ({
    ...venta,
    detalles: detallesPorVenta.get(venta.id) ?? [],
  }));
}
