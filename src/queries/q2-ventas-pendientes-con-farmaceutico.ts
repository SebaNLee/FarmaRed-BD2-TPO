import type { Db } from "mongodb";
import type { VentaMongoDocument } from "../schemas/mongo/venta.js";

export type VentaPendienteConFarmaceutico = {
  ventaId: string;
  fecha: Date;
  total: number;
  farmaceutico: {
    id: string;
    nombre: string;
    apellido: string;
    matricula: string;
  };
  sucursal: {
    id: string;
    nombre: string;
  };
};

export async function findVentasPendientesConFarmaceutico(db: Db): Promise<VentaPendienteConFarmaceutico[]> {
  return db
    .collection<VentaMongoDocument>("ventas")
    .aggregate<VentaPendienteConFarmaceutico>([
      { $match: { estado: "Pendiente" } },
      {
        $lookup: {
          from: "farmaceuticos",
          localField: "farmaceuticoId",
          foreignField: "_id",
          as: "farmaceuticoDocumento",
        },
      },
      { $unwind: "$farmaceuticoDocumento" },
      {
        $lookup: {
          from: "sucursales",
          localField: "farmaceuticoDocumento.sucursalId",
          foreignField: "_id",
          as: "sucursalDocumento",
        },
      },
      { $unwind: "$sucursalDocumento" },
      {
        $project: {
          _id: 0,
          ventaId: "$_id",
          fecha: 1,
          total: 1,
          farmaceutico: {
            id: "$farmaceuticoDocumento._id",
            nombre: "$farmaceuticoDocumento.nombre",
            apellido: "$farmaceuticoDocumento.apellido",
            matricula: "$farmaceuticoDocumento.matricula",
          },
          sucursal: {
            id: "$sucursalDocumento._id",
            nombre: "$sucursalDocumento.nombre",
          },
        },
      },
      { $sort: { fecha: -1, ventaId: 1 } },
    ])
    .toArray();
}
