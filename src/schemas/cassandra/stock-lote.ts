import type { types } from "cassandra-driver";

export type StockLoteRow = {
  sucursal_id: string;
  producto_id: string;
  vencimiento: types.LocalDate;
  lote_id: string;
  nro_lote: string;
  unidades: number;
};
