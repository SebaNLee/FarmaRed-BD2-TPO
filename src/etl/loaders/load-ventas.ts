import type { Venta } from "../../models/venta.js";
import { readCsv } from "../csv.js";
import { parseVenta, type VentaCsvRow } from "../parsers/venta.js";

export async function loadVentas(dataDirectory: string): Promise<Venta[]> {
  const rows = await readCsv<VentaCsvRow>(`${dataDirectory}/ventas.csv`);
  return rows.map(parseVenta);
}
