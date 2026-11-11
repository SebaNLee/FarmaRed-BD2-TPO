import type { EstadoReceta, Receta, TipoReceta } from "../../models/receta.js";
import { parseDate, parseNonNegativeInteger, parseNullableDate, parseOneOf, required } from "./shared.js";

export type RecetaCsvRow = {
  id_receta: string;
  id_cliente: string;
  medico: string;
  matricula_medico: string;
  fecha_emision: string;
  tipo: string;
  dispensas_autorizadas: string;
  dispensas_realizadas: string;
  proxima_dispensa: string;
  estado: string;
};

const tiposReceta = ["Simple", "Tratamiento prolongado", "Archivada"] as const satisfies readonly TipoReceta[];
const estadosReceta = ["Vigente", "Completada", "Vencida"] as const satisfies readonly EstadoReceta[];

export function parseReceta(row: RecetaCsvRow): Receta {
  return {
    id: required(row.id_receta, "id_receta"),
    clienteId: required(row.id_cliente, "id_cliente"),
    medico: required(row.medico, "medico"),
    matriculaMedico: required(row.matricula_medico, "matricula_medico"),
    fechaEmision: parseDate(row.fecha_emision, "fecha_emision"),
    tipo: parseOneOf(row.tipo, "tipo", tiposReceta),
    dispensasAutorizadas: parseNonNegativeInteger(row.dispensas_autorizadas, "dispensas_autorizadas"),
    dispensasRealizadas: parseNonNegativeInteger(row.dispensas_realizadas, "dispensas_realizadas"),
    proximaDispensa: parseNullableDate(row.proxima_dispensa, "proxima_dispensa"),
    estado: parseOneOf(row.estado, "estado", estadosReceta),
  };
}
