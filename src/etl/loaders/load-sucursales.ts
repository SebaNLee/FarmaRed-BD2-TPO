import type { Sucursal } from "../../models/sucursal.js";
import { readCsv } from "../csv.js";
import { parseSucursal, type SucursalCsvRow } from "../parsers/sucursal.js";

export async function loadSucursales(dataDirectory: string): Promise<Sucursal[]> {
  const rows = await readCsv<SucursalCsvRow>(`${dataDirectory}/sucursales.csv`);
  return rows.map(parseSucursal);
}
