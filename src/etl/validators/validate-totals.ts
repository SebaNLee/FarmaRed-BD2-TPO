import type { FarmaRedData } from "../load-data.js";

export function validateSaleTotals(data: FarmaRedData): string[] {
  const totalsBySale = new Map<string, number>();

  for (const detalle of data.detallesVenta) {
    const total = detalle.cantidad * detalle.precioUnitario;
    totalsBySale.set(detalle.ventaId, (totalsBySale.get(detalle.ventaId) ?? 0) + total);
  }

  return data.ventas
    .filter((venta) => venta.total !== (totalsBySale.get(venta.id) ?? 0))
    .map((venta) => {
      const expected = totalsBySale.get(venta.id) ?? 0;
      return `Venta ${venta.id}: total declarado ${venta.total}, total de detalles ${expected}.`;
    });
}
