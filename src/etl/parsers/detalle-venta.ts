import type { DetalleVenta } from "../../models/detalle-venta.js";
import { parseNonNegativeInteger, required } from "./shared.js";

export type DetalleVentaCsvRow = {
  id_detalle: string;
  id_venta: string;
  id_producto: string;
  cantidad: string;
  precio_unit: string;
};

export function parseDetalleVenta(row: DetalleVentaCsvRow): DetalleVenta {
  const cantidad = parseNonNegativeInteger(row.cantidad, "cantidad");

  if (cantidad === 0) {
    throw new Error("Field cantidad must be greater than zero.");
  }

  return {
    id: required(row.id_detalle, "id_detalle"),
    ventaId: required(row.id_venta, "id_venta"),
    productoId: required(row.id_producto, "id_producto"),
    cantidad,
    precioUnitario: parseNonNegativeInteger(row.precio_unit, "precio_unit"),
  };
}
