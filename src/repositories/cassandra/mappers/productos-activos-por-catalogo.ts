import type { Producto } from "../../../models/producto.js";
import type { Proveedor } from "../../../models/proveedor.js";
import {
  catalogoFarmaRed,
  type ProductosActivosPorCatalogoRow,
} from "../../../schemas/cassandra/productos-activos-por-catalogo.js";

export function toProductosActivosPorCatalogoRow(
  producto: Producto,
  proveedor: Proveedor,
): ProductosActivosPorCatalogoRow {
  if (!producto.activo) {
    throw new Error(`No se puede crear una fila de productos activos para ${producto.id}.`);
  }

  return {
    catalogo: catalogoFarmaRed,
    productoId: producto.id,
    productoNombre: producto.nombre,
    principioActivo: producto.principioActivo,
    categoria: producto.categoria,
    presentacion: producto.presentacion,
    condicionVenta: producto.condicionVenta,
    precioUnitario: producto.precioUnitario,
    proveedorId: proveedor.id,
    proveedorRazonSocial: proveedor.razonSocial,
    proveedorCuit: proveedor.cuit,
    proveedorTipo: proveedor.tipo,
    proveedorCiudad: proveedor.ciudad,
    proveedorProvincia: proveedor.provincia,
    proveedorTelefono: proveedor.telefono,
    proveedorActivo: proveedor.activo,
  };
}
