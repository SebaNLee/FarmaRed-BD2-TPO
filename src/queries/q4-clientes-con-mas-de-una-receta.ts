import type { Db } from "mongodb";
import type { Cliente } from "../models/cliente.js";
import type { RecetaMongoDocument } from "../schemas/mongo/receta.js";

export type ClienteConCantidadRecetas = {
  cliente: Cliente;
  cantidadRecetas: number;
};

export async function findClientesConMasDeUnaReceta(db: Db): Promise<ClienteConCantidadRecetas[]> {
  return db
    .collection<RecetaMongoDocument>("recetas")
    .aggregate<ClienteConCantidadRecetas>([
      {
        $group: {
          _id: "$clienteId",
          cantidadRecetas: { $sum: 1 },
        },
      },
      { $match: { cantidadRecetas: { $gt: 1 } } },
      {
        $lookup: {
          from: "clientes",
          localField: "_id",
          foreignField: "_id",
          as: "clienteDocumento",
        },
      },
      { $unwind: "$clienteDocumento" },
      {
        $project: {
          _id: 0,
          cantidadRecetas: 1,
          cliente: {
            id: "$clienteDocumento._id",
            nombre: "$clienteDocumento.nombre",
            apellido: "$clienteDocumento.apellido",
            dni: "$clienteDocumento.dni",
            email: "$clienteDocumento.email",
            telefono: "$clienteDocumento.telefono",
            ciudad: "$clienteDocumento.ciudad",
            provincia: "$clienteDocumento.provincia",
            obraSocial: "$clienteDocumento.obraSocial",
            nroAfiliado: "$clienteDocumento.nroAfiliado",
            activo: "$clienteDocumento.activo",
          },
        },
      },
      { $sort: { cantidadRecetas: -1, "cliente.apellido": 1, "cliente.nombre": 1 } },
    ])
    .toArray();
}
