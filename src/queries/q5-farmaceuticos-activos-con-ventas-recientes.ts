import type { Db } from "mongodb";
import type { Farmaceutico } from "../models/farmaceutico.js";
import type { FarmaceuticoMongoDocument } from "../schemas/mongo/farmaceutico.js";

export type FarmaceuticoConVentasRecientes = {
  farmaceutico: Farmaceutico;
  cantidadVentasUltimos60Dias: number;
};

function getFechaHace60Dias(now: Date): Date {
  const fecha = new Date(now);
  fecha.setUTCHours(0, 0, 0, 0);
  fecha.setUTCDate(fecha.getUTCDate() - 60);
  return fecha;
}

export async function findFarmaceuticosActivosConVentasRecientes(
  db: Db,
  now = new Date(),
): Promise<FarmaceuticoConVentasRecientes[]> {
  const fechaDesde = getFechaHace60Dias(now);

  return db
    .collection<FarmaceuticoMongoDocument>("farmaceuticos")
    .aggregate<FarmaceuticoConVentasRecientes>([
      { $match: { activo: true } },
      {
        $lookup: {
          from: "ventas",
          let: { farmaceuticoId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$farmaceuticoId", "$$farmaceuticoId"] },
                    { $gte: ["$fecha", fechaDesde] },
                    { $ne: ["$estado", "Anulada"] },
                  ],
                },
              },
            },
            { $count: "cantidad" },
          ],
          as: "ventasRecientes",
        },
      },
      {
        $project: {
          _id: 0,
          farmaceutico: {
            id: "$_id",
            nombre: "$nombre",
            apellido: "$apellido",
            matricula: "$matricula",
            cargo: "$cargo",
            sucursalId: "$sucursalId",
            activo: "$activo",
          },
          cantidadVentasUltimos60Dias: {
            $ifNull: [{ $arrayElemAt: ["$ventasRecientes.cantidad", 0] }, 0],
          },
        },
      },
      { $sort: { cantidadVentasUltimos60Dias: -1, "farmaceutico.apellido": 1 } },
    ])
    .toArray();
}
