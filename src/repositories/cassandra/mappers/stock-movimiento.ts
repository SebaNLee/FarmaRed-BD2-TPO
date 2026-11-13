import { types } from "cassandra-driver";
import type { MovimientoStock } from "../../../models/stock-movimiento.js";
import type { StockMovimientoRow } from "../../../schemas/cassandra/stock-movimiento.js";
import { fromDateOnlyString, toDateOnlyString } from "../../../utils/date.js";

export function toStockMovimientoRow(movimiento: MovimientoStock): StockMovimientoRow {
  return {
    venta_id: movimiento.ventaId,
    lote_id: movimiento.loteId,
    sucursal_id: movimiento.sucursalId,
    producto_id: movimiento.productoId,
    vencimiento: types.LocalDate.fromString(toDateOnlyString(movimiento.vencimiento)),
    cantidad: movimiento.cantidad,
    estado: movimiento.estado,
    actualizado_en: movimiento.actualizadoEn,
  };
}

export function fromStockMovimientoRow(row: StockMovimientoRow): MovimientoStock {
  return {
    ventaId: row.venta_id,
    loteId: row.lote_id,
    sucursalId: row.sucursal_id,
    productoId: row.producto_id,
    vencimiento: fromDateOnlyString(row.vencimiento.toString()),
    cantidad: row.cantidad,
    estado: row.estado,
    actualizadoEn: row.actualizado_en,
  };
}

export function toLocalDate(value: Date): types.LocalDate {
  return types.LocalDate.fromString(toDateOnlyString(value));
}
