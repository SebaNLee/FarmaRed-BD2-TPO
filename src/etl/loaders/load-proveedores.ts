import type { Proveedor } from "../../models/proveedor.js";
import { readCsv } from "../csv.js";
import { parseProveedor, type ProveedorCsvRow } from "../parsers/proveedor.js";

export async function loadProveedores(dataDirectory: string): Promise<Proveedor[]> {
  const rows = await readCsv<ProveedorCsvRow>(`${dataDirectory}/proveedores.csv`);
  return rows.map(parseProveedor);
}
