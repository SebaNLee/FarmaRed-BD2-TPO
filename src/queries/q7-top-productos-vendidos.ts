import type { Db } from "mongodb";
import type { Producto } from "../models/producto.js";
import type { ProductoMongoDocument } from "../schemas/mongo/producto.js";
import type { VentaMongoDocument } from "../schemas/mongo/venta.js";
import { withId } from "./util/mappers.js";

export type ProductoMasVendido = Producto & { unidadesVendidas: number };

/**
 * Q7: devuelve los 5 productos con más unidades vendidas, contando solo
 * ventas 'Completada'. Se resuelve en una sola llamada (aggregate + $lookup).
 * Incluye productos inactivos; si hay empate en el 5.º puesto, desempata por
 * ID y devuelve exactamente 5. Descarta productos inexistentes en el catálogo.
 */
export async function topProductosMasVendidos(db: Db): Promise<ProductoMasVendido[]> {
  const orden = { unidadesVendidas: -1, _id: 1 } as const;

  const productos = await db
    .collection<VentaMongoDocument>("ventas")
    .aggregate<ProductoMongoDocument & { unidadesVendidas: number }>([
      { $match: { estado: "Completada" } },
      { $unwind: "$detalles" },
      { $group: { _id: "$detalles.productoId", unidadesVendidas: { $sum: "$detalles.cantidad" } } },
      { $sort: orden },
      { $limit: 5 },
      { $lookup: { from: "productos", localField: "_id", foreignField: "_id", as: "producto" } },
      { $unwind: "$producto" },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$producto", { unidadesVendidas: "$unidadesVendidas" }] } } },
      { $sort: orden },
    ])
    .toArray();

  return productos.map((producto): ProductoMasVendido => withId(producto));
}
