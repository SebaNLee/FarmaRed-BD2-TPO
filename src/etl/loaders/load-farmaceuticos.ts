import type { Farmaceutico } from "../../models/farmaceutico.js";
import { readCsv } from "../csv.js";
import { parseFarmaceutico, type FarmaceuticoCsvRow } from "../parsers/farmaceutico.js";

export async function loadFarmaceuticos(dataDirectory: string): Promise<Farmaceutico[]> {
  const rows = await readCsv<FarmaceuticoCsvRow>(`${dataDirectory}/farmaceuticos.csv`);
  return rows.map(parseFarmaceutico);
}
