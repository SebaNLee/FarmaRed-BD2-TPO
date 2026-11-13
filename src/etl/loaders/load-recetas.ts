import type { Receta } from "../../models/receta.js";
import { readCsv } from "../csv.js";
import { parseReceta, type RecetaCsvRow } from "../parsers/receta.js";

export async function loadRecetas(dataDirectory: string): Promise<Receta[]> {
  const rows = await readCsv<RecetaCsvRow>(`${dataDirectory}/recetas.csv`);
  return rows.map(parseReceta);
}
