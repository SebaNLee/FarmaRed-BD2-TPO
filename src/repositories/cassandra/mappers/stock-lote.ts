import { types } from "cassandra-driver";
import type { LoteStock } from "../../../models/lote.stock.js";
import type { StockLoteRow } from "../../../schemas/cassandra/stock-lote.js";
import { fromDateOnlyString, toDateOnlyString } from "../../../utils/date.js";

export function toStockLoteRow(lote: LoteStock): StockLoteRow {
  return {
    sucursal_id: lote.sucursalId,
    producto_id: lote.productoId,
    vencimiento: types.LocalDate.fromString(toDateOnlyString(lote.vencimiento)),
    lote_id: lote.id,
    nro_lote: lote.numeroLote,
    unidades: lote.unidades,
  };
}

export function fromStockLoteRow(row: StockLoteRow): LoteStock {
  return {
    id: row.lote_id,
    productoId: row.producto_id,
    sucursalId: row.sucursal_id,
    numeroLote: row.nro_lote,
    unidades: row.unidades,
    vencimiento: fromDateOnlyString(row.vencimiento.toString()),
  };
}
