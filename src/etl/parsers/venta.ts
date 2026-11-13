import type { EstadoVenta, MedioPago, TipoVenta, Venta } from "../../models/venta.js";
import { nullable, parseDate, parseNonNegativeInteger, parseOneOf, required } from "./shared.js";

export type VentaCsvRow = {
  id_venta: string;
  id_cliente: string;
  id_farmaceutico: string;
  id_receta: string;
  fecha: string;
  tipo: string;
  medio_pago: string;
  total: string;
  estado: string;
};

const tiposVenta = ["Con receta", "Venta libre"] as const satisfies readonly TipoVenta[];
const mediosPago = [
  "Efectivo",
  "Débito",
  "Crédito",
  "Transferencia",
  "Obra social",
] as const satisfies readonly MedioPago[];
const estadosVenta = ["Completada", "Pendiente", "Anulada"] as const satisfies readonly EstadoVenta[];

export function parseVenta(row: VentaCsvRow): Venta {
  return {
    id: required(row.id_venta, "id_venta"),
    clienteId: required(row.id_cliente, "id_cliente"),
    farmaceuticoId: required(row.id_farmaceutico, "id_farmaceutico"),
    recetaId: nullable(row.id_receta),
    fecha: parseDate(row.fecha, "fecha"),
    tipo: parseOneOf(row.tipo, "tipo", tiposVenta),
    medioPago: parseOneOf(row.medio_pago, "medio_pago", mediosPago),
    total: parseNonNegativeInteger(row.total, "total"),
    estado: parseOneOf(row.estado, "estado", estadosVenta),
  };
}
