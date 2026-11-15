import type { Client } from "cassandra-driver";
import type { Db } from "mongodb";
import type { LoteStock } from "../models/lote.stock.js";
import { CassandraStockRepository } from "../repositories/cassandra/stock-repository.js";
import type { ProductoMongoDocument } from "../schemas/mongo/producto.js";
import type { ProveedorMongoDocument } from "../schemas/mongo/proveedor.js";
import type { SucursalMongoDocument } from "../schemas/mongo/sucursal.js";

const UNIDADES_MINIMAS = 50;

export type LoteBajoStock = LoteStock & {
  producto: ProductoMongoDocument;
  sucursal: SucursalMongoDocument;
  proveedor: ProveedorMongoDocument;
};

type ProductoConProveedor = ProductoMongoDocument & { proveedor: ProveedorMongoDocument };

/**
 * Q8: devuelve los lotes con menos de 50 unidades, con su producto, sucursal
 * y el proveedor del producto.
 *
 * stock_lotes se particiona por (sucursal_id, producto_id), así que Cassandra
 * no puede filtrar por unidades sin recorrer toda la tabla: se hace un escaneo
 * completo y se filtra en memoria. Con los IDs de producto y sucursal de los
 * lotes filtrados se consulta MongoDB y se unen los resultados en memoria.
 *
 * Incluye lotes vencidos (el enunciado no los excluye; el vencimiento queda
 * visible) y productos, sucursales y proveedores inactivos. Descarta lotes
 * cuyo producto o sucursal no exista en MongoDB. Ordena por unidades
 * ascendente (lo más crítico primero) y desempata por ID de lote.
 */
export async function lotesBajoStock(cassandra: Client, db: Db): Promise<LoteBajoStock[]> {
  const lotes = await new CassandraStockRepository(cassandra).findAllLotes();
  const lotesBajos = lotes.filter((lote) => lote.unidades < UNIDADES_MINIMAS);
  if (lotesBajos.length === 0) {
    return [];
  }

  const productoIds = [...new Set(lotesBajos.map((lote) => lote.productoId))];
  const sucursalIds = [...new Set(lotesBajos.map((lote) => lote.sucursalId))];

  const [productos, sucursales] = await Promise.all([
    db
      .collection<ProductoMongoDocument>("productos")
      .aggregate<ProductoConProveedor>([
        { $match: { _id: { $in: productoIds } } },
        { $lookup: { from: "proveedores", localField: "proveedorId", foreignField: "_id", as: "proveedor" } },
        { $unwind: "$proveedor" },
      ])
      .toArray(),
    db
      .collection<SucursalMongoDocument>("sucursales")
      .find({ _id: { $in: sucursalIds } })
      .toArray(),
  ]);

  const productosPorId = new Map(productos.map((producto) => [producto._id, producto]));
  const sucursalesPorId = new Map(sucursales.map((sucursal) => [sucursal._id, sucursal]));

  return lotesBajos
    .flatMap((lote): LoteBajoStock[] => {
      const productoConProveedor = productosPorId.get(lote.productoId);
      const sucursal = sucursalesPorId.get(lote.sucursalId);
      if (!productoConProveedor || !sucursal) {
        return [];
      }
      const { proveedor, ...producto } = productoConProveedor;
      return [{ ...lote, producto, sucursal, proveedor }];
    })
    .sort((a, b) => a.unidades - b.unidades || a.id.localeCompare(b.id));
}
