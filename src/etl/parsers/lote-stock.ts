import type { LoteStock } from "../../models/lote.stock.js";
import { parseDate, parseNonNegativeInteger, required } from "./shared.js";

export type LoteStockCsvRow = {
  id_lote: string;
  id_producto: string;
  id_sucursal: string;
  nro_lote: string;
  unidades: string;
  vencimiento: string;
};

export function parseLoteStock(row: LoteStockCsvRow): LoteStock {
  return {
    id: required(row.id_lote, "id_lote"),
    productoId: required(row.id_producto, "id_producto"),
    sucursalId: required(row.id_sucursal, "id_sucursal"),
    numeroLote: required(row.nro_lote, "nro_lote"),
    unidades: parseNonNegativeInteger(row.unidades, "unidades"),
    vencimiento: parseDate(row.vencimiento, "vencimiento"),
  };
}
