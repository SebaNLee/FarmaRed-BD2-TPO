import type { Producto } from "../../../models/producto.js";
import type { Proveedor } from "../../../models/proveedor.js";
import type { ProductosActivosByBucketRow } from "../../../schemas/cassandra/productos-activos-by-bucket.js";

export function toProductosActivosByBucketRow(producto: Producto, proveedor: Proveedor): ProductosActivosByBucketRow {
  if (!producto.activo) {
    throw new Error(`No se puede crear una fila de productos activos para ${producto.id}.`);
  }

  return {
    bucket: 0,
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
