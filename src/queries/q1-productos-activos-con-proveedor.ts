import type { Db } from "mongodb";
import type { Producto } from "../models/producto.js";
import type { Proveedor } from "../models/proveedor.js";
import type { ProductoMongoDocument } from "../schemas/mongo/producto.js";

export type ProductoActivoConProveedor = Omit<Producto, "proveedorId"> & {
  proveedor: Proveedor;
};

/** Query 1: productos activos con todos los datos de su proveedor. */
export async function findProductosActivosConProveedor(db: Db): Promise<ProductoActivoConProveedor[]> {
  return db
    .collection<ProductoMongoDocument>("productos")
    .aggregate<ProductoActivoConProveedor>([
      { $match: { activo: true } },
      {
        $lookup: {
          from: "proveedores",
          localField: "proveedorId",
          foreignField: "_id",
          as: "proveedorDocumento",
        },
      },
      { $unwind: "$proveedorDocumento" },
      {
        $project: {
          _id: 0,
          id: "$_id",
          nombre: 1,
          principioActivo: 1,
          categoria: 1,
          presentacion: 1,
          condicionVenta: 1,
          precioUnitario: 1,
          activo: 1,
          proveedor: {
            id: "$proveedorDocumento._id",
            razonSocial: "$proveedorDocumento.razonSocial",
            cuit: "$proveedorDocumento.cuit",
            tipo: "$proveedorDocumento.tipo",
            ciudad: "$proveedorDocumento.ciudad",
            provincia: "$proveedorDocumento.provincia",
            telefono: "$proveedorDocumento.telefono",
            activo: "$proveedorDocumento.activo",
          },
        },
      },
      { $sort: { nombre: 1, id: 1 } },
    ])
    .toArray();
}
