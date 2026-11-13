import type { Producto } from "../models/producto.js";
import type { Proveedor } from "../models/proveedor.js";
import type { CassandraFarmaRedRepository } from "../repositories/cassandra/farmared-repository.js";

export type ProductoActivoConProveedor = Producto & { proveedor: Proveedor };

/**
 * Q01: productos activos con todos los datos de su proveedor, incluso si este está inactivo.
 * @param repository Repositorio conectado a Cassandra con la vista cargada.
 * @returns Productos activos con su proveedor embebido, ordenados por ID de producto.
 * Usa solo cassandra
 */
export async function q01(repository: CassandraFarmaRedRepository): Promise<ProductoActivoConProveedor[]> {
  const rows = await repository.getProductosActivos();
  return rows.map((row) => ({
    id: row.productoId,
    nombre: row.productoNombre,
    principioActivo: row.principioActivo,
    categoria: row.categoria,
    presentacion: row.presentacion,
    condicionVenta: row.condicionVenta,
    precioUnitario: row.precioUnitario,
    proveedorId: row.proveedorId,
    activo: true,
    proveedor: {
      id: row.proveedorId,
      razonSocial: row.proveedorRazonSocial,
      cuit: row.proveedorCuit,
      tipo: row.proveedorTipo,
      ciudad: row.proveedorCiudad,
      provincia: row.proveedorProvincia,
      telefono: row.proveedorTelefono,
      activo: row.proveedorActivo,
    },
  }));
}
