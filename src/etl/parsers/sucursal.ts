import type { Sucursal, TipoSucursal } from "../../models/sucursal.js";
import { parseBoolean, parseOneOf, required } from "./shared.js";

export type SucursalCsvRow = {
  id_sucursal: string;
  nombre: string;
  tipo: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  activo: string;
};

const tiposSucursal = ["Farmacia", "Droguería"] as const satisfies readonly TipoSucursal[];

export function parseSucursal(row: SucursalCsvRow): Sucursal {
  return {
    id: required(row.id_sucursal, "id_sucursal"),
    nombre: required(row.nombre, "nombre"),
    tipo: parseOneOf(row.tipo, "tipo", tiposSucursal),
    direccion: required(row.direccion, "direccion"),
    ciudad: required(row.ciudad, "ciudad"),
    provincia: required(row.provincia, "provincia"),
    telefono: required(row.telefono, "telefono"),
    activo: parseBoolean(row.activo, "activo"),
  };
}
