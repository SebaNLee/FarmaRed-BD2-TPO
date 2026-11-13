import type { CondicionVenta, Producto } from "../../models/producto.js";
import { parseBoolean, parseNumber, parseOneOf, required } from "./shared.js";

export type ProductoCsvRow = {
  id_producto: string;
  nombre: string;
  principio_activo: string;
  categoria: string;
  presentacion: string;
  condicion_venta: string;
  precio_unit: string;
  id_proveedor: string;
  activo: string;
};

const condicionesVenta = [
  "Venta libre",
  "Bajo receta",
  "Bajo receta archivada",
] as const satisfies readonly CondicionVenta[];

export function parseProducto(row: ProductoCsvRow): Producto {
  return {
    id: required(row.id_producto, "id_producto"),
    nombre: required(row.nombre, "nombre"),
    principioActivo: required(row.principio_activo, "principio_activo"),
    categoria: required(row.categoria, "categoria"),
    presentacion: required(row.presentacion, "presentacion"),
    condicionVenta: parseOneOf(row.condicion_venta, "condicion_venta", condicionesVenta),
    precioUnitario: parseNumber(row.precio_unit, "precio_unit"),
    proveedorId: required(row.id_proveedor, "id_proveedor"),
    activo: parseBoolean(row.activo, "activo"),
  };
}
