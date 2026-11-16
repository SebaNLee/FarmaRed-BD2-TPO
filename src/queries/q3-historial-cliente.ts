import type { Db } from "mongodb";
import type { Receta } from "../models/receta.js";
import type { Venta } from "../models/venta.js";
import type { VentaMongoDocument } from "../schemas/mongo/venta.js";

type VentaHistorial = Omit<Venta, "clienteId" | "fecha"> & {
  detalles: Array<{
    id: string;
    productoId: string;
    cantidad: number;
    precioUnitario: number;
  }>;
};

type RecetaHistorial = Omit<Receta, "clienteId" | "fechaEmision">;

export type HistorialClienteEvent =
  | {
      eventoId: string;
      tipoEvento: "VENTA";
      fecha: Date;
      venta: VentaHistorial;
    }
  | {
      eventoId: string;
      tipoEvento: "RECETA";
      fecha: Date;
      receta: RecetaHistorial;
    };

/** Query 3: historial completo de ventas y recetas de un cliente, por fecha. */
export async function findHistorialCliente(db: Db, clienteId: string): Promise<HistorialClienteEvent[]> {
  return db
    .collection<VentaMongoDocument>("ventas")
    .aggregate<HistorialClienteEvent>([
      { $match: { clienteId } },
      {
        $project: {
          _id: 0,
          eventoId: "$_id",
          tipoEvento: { $literal: "VENTA" },
          fecha: 1,
          venta: {
            id: "$_id",
            recetaId: "$recetaId",
            tipo: "$tipo",
            medioPago: "$medioPago",
            total: "$total",
            estado: "$estado",
            detalles: {
              $map: {
                input: "$detalles",
                as: "detalle",
                in: {
                  id: "$$detalle._id",
                  productoId: "$$detalle.productoId",
                  cantidad: "$$detalle.cantidad",
                  precioUnitario: "$$detalle.precioUnitario",
                },
              },
            },
          },
        },
      },
      {
        $unionWith: {
          coll: "recetas",
          pipeline: [
            { $match: { clienteId } },
            {
              $project: {
                _id: 0,
                eventoId: "$_id",
                tipoEvento: { $literal: "RECETA" },
                fecha: "$fechaEmision",
                receta: {
                  id: "$_id",
                  medico: "$medico",
                  matriculaMedico: "$matriculaMedico",
                  tipo: "$tipo",
                  dispensasAutorizadas: "$dispensasAutorizadas",
                  dispensasRealizadas: "$dispensasRealizadas",
                  proximaDispensa: "$proximaDispensa",
                  estado: "$estado",
                },
              },
            },
          ],
        },
      },
      { $sort: { fecha: 1, tipoEvento: 1, eventoId: 1 } },
    ])
    .toArray();
}
