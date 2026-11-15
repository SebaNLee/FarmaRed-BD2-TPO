export type EstadoOperacionVenta = "PENDIENTE" | "CONFIRMADA" | "ABORTADA";

export type BloqueoOperacionVenta = {
  propietario: string;
  expiraEn: Date;
};

/**
 * Registry for coordination for venta/stock
 */
export type OperacionVenta = {
  id: string;
  estado: EstadoOperacionVenta;
  bloqueo: BloqueoOperacionVenta | null;
  versionBloqueo: number;
  error: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
};

export type BloqueoOperacion = {
  propietario: string;
  version: number;
  expiraEn: Date;
};
