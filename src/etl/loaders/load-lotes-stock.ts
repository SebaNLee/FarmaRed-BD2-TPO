import type { LoteStock } from "../../models/lote.stock.js";
import { readCsv } from "../csv.js";
import { parseLoteStock, type LoteStockCsvRow } from "../parsers/lote-stock.js";

export async function loadLotesStock(dataDirectory: string): Promise<LoteStock[]> {
  const rows = await readCsv<LoteStockCsvRow>(`${dataDirectory}/stock_lotes.csv`);
  return rows.map(parseLoteStock);
}
