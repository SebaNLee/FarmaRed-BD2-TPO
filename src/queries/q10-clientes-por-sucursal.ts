import type { Db } from "mongodb";
import type { Cliente } from "../models/cliente.js";
import type { ClienteMongoDocument } from "../schemas/mongo/cliente.js";
import type { FarmaceuticoMongoDocument } from "../schemas/mongo/farmaceutico.js";
import { withId } from "./util/mappers.js";

/**
 * Q10: devuelve los clientes atendidos en una sucursal, sin duplicados.
 * Considera ventas registradas por farmacéuticos activos e inactivos,
 * incluyendo todos los estados de venta, incluso 'Anulada'.
 * Incluye también clientes inactivos.
 *
 *  retorna clientes ordenados por apellido, nombre e id;
 */
export async function clientesPorSucursal(db: Db, sucursalId: string): Promise<Cliente[]> {
  const clientes = await db
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

  return clientes.map((cliente): Cliente => withId(cliente));
}
