import { MongoServerError, type Db } from "mongodb";
import { z } from "zod";
import type { Cliente } from "../models/cliente.js";
import type { ClienteMongoDocument } from "../schemas/mongo/cliente.js";

const texto = z.string().trim().min(1);
const contactoCoberturaSchema = z.object({
  email: texto,
  telefono: texto,
  ciudad: texto,
  provincia: texto,
  obraSocial: texto,
  nroAfiliado: z
    .string()
    .trim()
    .transform((value) => value || null)
    .nullable(),
});
const altaSchema = contactoCoberturaSchema
  .extend({
    id: texto,
    nombre: texto,
    apellido: texto,
    dni: texto,
  })
  .strict();
const modificacionSchema = contactoCoberturaSchema
  .partial()
  .strict()
  .refine(
    (datos) => Object.values(datos).some((value) => value !== undefined),
    "Provide at least one contact or coverage field.",
  );

export type ModificacionCliente = Partial<
  Pick<Cliente, "email" | "telefono" | "ciudad" | "provincia" | "obraSocial" | "nroAfiliado">
>;

/** Q13 alta: recibe datos del cliente y devuelve el documento creado en MongoDB.
 * Crea clientes activos; requiere el índice único de DNI de mongo:setup.
 */
export async function altaCliente(db: Db, datos: Omit<Cliente, "activo">): Promise<ClienteMongoDocument> {
  const { id, ...campos } = altaSchema.parse(datos);
  const cliente: ClienteMongoDocument = { _id: id, ...campos, activo: true };

  try {
    await db.collection<ClienteMongoDocument>("clientes").insertOne(cliente);
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      if (error.keyPattern?.dni) {
        throw new Error(`A client with DNI ${cliente.dni} already exists.`, { cause: error });
      }
      throw new Error(`A client with ID ${cliente._id} already exists.`, { cause: error });
    }
    throw error;
  }

  return cliente;
}

/** Q13 modificación: recibe ID y cambios de contacto/cobertura; devuelve el cliente actualizado en MongoDB. */
export async function modificarCliente(
  db: Db,
  clienteId: string,
  cambios: ModificacionCliente,
): Promise<ClienteMongoDocument> {
  const id = texto.parse(clienteId);
  const datos = modificacionSchema.parse(cambios);
  const campos = Object.fromEntries(Object.entries(datos).filter(([, value]) => value !== undefined));
  const cliente = await db
    .collection<ClienteMongoDocument>("clientes")
    .findOneAndUpdate({ _id: id }, { $set: campos }, { returnDocument: "after" });

  if (!cliente) {
    throw new Error(`Client ${id} does not exist.`);
  }
  return cliente;
}

/** Q13 baja lógica: recibe el ID y devuelve el documento con activo=false, sin eliminarlo de MongoDB. */
export async function bajaCliente(db: Db, clienteId: string): Promise<ClienteMongoDocument> {
  const id = texto.parse(clienteId);
  const cliente = await db
    .collection<ClienteMongoDocument>("clientes")
    .findOneAndUpdate({ _id: id }, { $set: { activo: false } }, { returnDocument: "after" });

  if (!cliente) {
    throw new Error(`Client ${id} does not exist.`);
  }
  return cliente;
}
