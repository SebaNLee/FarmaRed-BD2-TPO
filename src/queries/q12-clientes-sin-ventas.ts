import dayjs from "dayjs";
import type { Db } from "mongodb";
import { env } from "../config/env.js";
import type { ClienteMongoDocument } from "../schemas/mongo/cliente.js";
import { fromDateOnlyString } from "../utils/date.js";

/**
 * Q12: devuelve clientes sin ventas en el último año.
 * Incluye clientes inactivos y sin compras. Cuenta todos los estados
 * de venta (Osea si tiene ventas canceladas queda excluido)
 */
export async function clientesSinVentasUltimoAnio(db: Db): Promise<ClienteMongoDocument[]> {
  const fechaActual = new Intl.DateTimeFormat("en-US", {
    timeZone: env.TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = fechaActual.find((part) => part.type === "year")!.value;
  const month = fechaActual.find((part) => part.type === "month")!.value;
  const day = fechaActual.find((part) => part.type === "day")!.value;
  const hoy = dayjs(`${year}-${month}-${day}`);

  const desde = fromDateOnlyString(hoy.subtract(1, "year").format("YYYY-MM-DD"));
  const hasta = fromDateOnlyString(hoy.add(1, "day").format("YYYY-MM-DD"));

  return db
    .collection<ClienteMongoDocument>("clientes")
    .aggregate<ClienteMongoDocument>([
      {
        $lookup: {
          from: "ventas",
          localField: "_id",
          foreignField: "clienteId",
          pipeline: [{ $match: { fecha: { $gte: desde, $lt: hasta } } }, { $limit: 1 }, { $project: { _id: 1 } }],
          as: "ventasRecientes",
        },
      },
      { $match: { "ventasRecientes.0": { $exists: false } } },
      { $unset: "ventasRecientes" },
      { $sort: { apellido: 1, nombre: 1, _id: 1 } },
    ])
    .toArray();
}
