import type { types } from "cassandra-driver";
import type { EstadoMovimientoStock } from "../../models/stock-movimiento.js";

export type StockMovimientoRow = {
  venta_id: string;
  lote_id: string;
  sucursal_id: string;
  producto_id: string;
  vencimiento: types.LocalDate | string;
  cantidad: number;
  estado: EstadoMovimientoStock;
  actualizado_en: Date;
};
