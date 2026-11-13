import type { Db } from "mongodb";
import type { ClienteMongoDocument } from "../schemas/mongo/cliente.js";
import type { FarmaceuticoMongoDocument } from "../schemas/mongo/farmaceutico.js";

/**
 * Q10: devuelve los clientes atendidos en una sucursal, sin duplicados.
 * Incluye farmacéuticos y clientes inactivos y todos los estados de venta
 * (incluso las 'Anulada', la consigna no especifica si van o no)
 *
 *  retorna clientes ordenados por apellido, nombre e _id;
 */
export async function clientesPorSucursal(db: Db, sucursalId: string): Promise<ClienteMongoDocument[]> {
  return db
    .collection<FarmaceuticoMongoDocument>("farmaceuticos")
    .aggregate<ClienteMongoDocument>([
      { $match: { sucursalId } },
      {
        $lookup: {
          from: "ventas",
          localField: "_id",
          foreignField: "farmaceuticoId",
          as: "ventas",
        },
      },
      { $unwind: "$ventas" },
      { $group: { _id: "$ventas.clienteId" } },
      {
        $lookup: {
          from: "clientes",
          localField: "_id",
          foreignField: "_id",
          as: "cliente",
        },
      },
      { $unwind: "$cliente" },
      { $replaceRoot: { newRoot: "$cliente" } },
      { $sort: { apellido: 1, nombre: 1, _id: 1 } },
    ])
    .toArray();
}
