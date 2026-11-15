import type { Db } from "mongodb";
import type { EstadoVenta } from "../models/venta.js";
import type { VentaMongoDocument } from "../schemas/mongo/venta.js";

const MONTO_MAXIMO = 5000;
const ESTADOS_VALIDOS: EstadoVenta[] = ["Completada", "Pendiente"];

/**
 * Q9: devuelve las ventas de tipo 'Venta libre' con total menor a $5000.
 * Se resuelve en una sola llamada (find) que usa el índice free_sales_by_total.
 * Excluye las ventas 'Anulada' (filtra por Completada y Pendiente con $in, que
 * acota el campo estado del índice). Devuelve la venta completa con sus
 * detalles, ordenada por total ascendente.
 */
export async function ventasLibresMenoresA5000(db: Db): Promise<VentaMongoDocument[]> {
  return db
    .collection<VentaMongoDocument>("ventas")
    .find({ tipo: "Venta libre", estado: { $in: ESTADOS_VALIDOS }, total: { $lt: MONTO_MAXIMO } })
    .sort({ total: 1, _id: 1 })
    .toArray();
}
