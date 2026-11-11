import type { Producto } from "../../models/producto.js";
import { readCsv } from "../csv.js";
import { parseProducto, type ProductoCsvRow } from "../parsers/producto.js";

export async function loadProductos(dataDirectory: string): Promise<Producto[]> {
  const rows = await readCsv<ProductoCsvRow>(`${dataDirectory}/productos.csv`);
  return rows.map(parseProducto);
}
