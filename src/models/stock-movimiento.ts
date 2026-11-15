export type EstadoMovimientoStock = "PENDIENTE" | "APLICADO" | "REVERTIDO";

export type MovimientoStock = {
  ventaId: string;
  loteId: string;
  sucursalId: string;
  productoId: string;
  vencimiento: Date;
  cantidad: number;
  estado: EstadoMovimientoStock;
  actualizadoEn: Date;
  unidadesAntes?: number;
  unidadesDespues?: number;
};
