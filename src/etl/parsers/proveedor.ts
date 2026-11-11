import type { Proveedor, TipoProveedor } from "../../models/proveedor.js";
import { parseBoolean, parseOneOf, required } from "./shared.js";

export type ProveedorCsvRow = {
  id_proveedor: string;
  razon_social: string;
  cuit: string;
  tipo: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  activo: string;
};

const tiposProveedor = ["Laboratorio", "Droguería"] as const satisfies readonly TipoProveedor[];

export function parseProveedor(row: ProveedorCsvRow): Proveedor {
  return {
    id: required(row.id_proveedor, "id_proveedor"),
    razonSocial: required(row.razon_social, "razon_social"),
    cuit: required(row.cuit, "cuit"),
    tipo: parseOneOf(row.tipo, "tipo", tiposProveedor),
    ciudad: required(row.ciudad, "ciudad"),
    provincia: required(row.provincia, "provincia"),
    telefono: required(row.telefono, "telefono"),
    activo: parseBoolean(row.activo, "activo"),
  };
}
