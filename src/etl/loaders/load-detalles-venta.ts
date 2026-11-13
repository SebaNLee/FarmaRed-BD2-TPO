import type { DetalleVenta } from "../../models/detalle-venta.js";
import { readCsv } from "../csv.js";
import { parseDetalleVenta, type DetalleVentaCsvRow } from "../parsers/detalle-venta.js";

export async function loadDetallesVenta(dataDirectory: string): Promise<DetalleVenta[]> {
  const rows = await readCsv<DetalleVentaCsvRow>(`${dataDirectory}/detalle_ventas.csv`);
  return rows.map(parseDetalleVenta);
}
