import type { Db } from "mongodb";
import { env } from "../config/env.js";
import type { FarmaceuticoMongoDocument } from "../schemas/mongo/farmaceutico.js";

export type IngresosPorFarmaceutico = {
  farmaceuticoId: string;
  nombre: string;
  apellido: string;
  ingresosTotales: number;
};

/**
 * Q11: devuelve los ingresos del mes actual de TODOS los farmacéuticos.
 * Suma solo ventas 'Completada'.
 *
 * // TODO : esto noc si esta bien,
 * si un farmaceutico no tiene ventas completadas, lo incluimos pero con ventas=0
 * por ahi no habria que incluirlo en la respuesta. no dice nada el pdf
 */
export async function ingresosPorFarmaceuticoMesActual(db: Db): Promise<IngresosPorFarmaceutico[]> {
  const fechaActual = new Intl.DateTimeFormat("en-US", {
    timeZone: env.TZ,
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());
  const year = Number(fechaActual.find((part) => part.type === "year")!.value);
  const month = Number(fechaActual.find((part) => part.type === "month")!.value);

  const inicioMes = new Date(Date.UTC(year, month - 1, 1));
  const inicioMesSiguiente = new Date(Date.UTC(year, month, 1));

  return db
    .collection<FarmaceuticoMongoDocument>("farmaceuticos")
    .aggregate<IngresosPorFarmaceutico>([
      {
        $lookup: {
          from: "ventas",
          localField: "_id",
          foreignField: "farmaceuticoId",
          pipeline: [
            {
              $match: {
                estado: "Completada",
                fecha: { $gte: inicioMes, $lt: inicioMesSiguiente },
              },
            },
            { $group: { _id: null, total: { $sum: "$total" } } },
          ],
          as: "ingresos",
        },
      },
      {
        $project: {
          _id: 0,
          farmaceuticoId: "$_id",
          nombre: 1,
          apellido: 1,
          ingresosTotales: { $ifNull: [{ $arrayElemAt: ["$ingresos.total", 0] }, 0] },
        },
      },
      { $sort: { ingresosTotales: -1, farmaceuticoId: 1 } },
    ])
    .toArray();
}
