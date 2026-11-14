import type { Db } from "mongodb";
import { env } from "../config/env.js";
import type { ClienteMongoDocument } from "../schemas/mongo/cliente.js";
import type { RecetaMongoDocument } from "../schemas/mongo/receta.js";
import { fromDateOnlyString } from "../utils/date.js";

export type RecetaConCliente = RecetaMongoDocument & { cliente: ClienteMongoDocument };

/**
 * Q6: devuelve recetas de tratamiento prolongado en estado 'Vigente' cuya
 * próxima dispensa es anterior a hoy, con los datos del cliente embebidos.
 * Se resuelve en una sola llamada (aggregate + $lookup) y el $match usa el
 * índice long_treatment_due. Incluye clientes inactivos. Ordena de la
 * dispensa más atrasada a la más reciente.
 */
export async function recetasProlongadasConDispensaVencida(db: Db): Promise<RecetaConCliente[]> {
  const fechaActual = new Intl.DateTimeFormat("en-US", {
    timeZone: env.TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = fechaActual.find((part) => part.type === "year")!.value;
  const month = fechaActual.find((part) => part.type === "month")!.value;
  const day = fechaActual.find((part) => part.type === "day")!.value;
  const hoy = fromDateOnlyString(`${year}-${month}-${day}`);

  return db
    .collection<RecetaMongoDocument>("recetas")
    .aggregate<RecetaConCliente>([
      { $match: { tipo: "Tratamiento prolongado", estado: "Vigente", proximaDispensa: { $lt: hoy } } },
      { $lookup: { from: "clientes", localField: "clienteId", foreignField: "_id", as: "cliente" } },
      { $unwind: "$cliente" },
      { $sort: { proximaDispensa: 1, _id: 1 } },
    ])
    .toArray();
}
