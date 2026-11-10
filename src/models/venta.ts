export type TipoVenta = "Con receta" | "Venta libre";

export type MedioPago = "Efectivo" | "Débito" | "Crédito" | "Transferencia" | "Obra social";

export type EstadoVenta = "Completada" | "Pendiente" | "Anulada";

export type Venta = {
  id: string;
  clienteId: string;
  farmaceuticoId: string;
  recetaId: string | null;
  fecha: Date;
  tipo: TipoVenta;
  medioPago: MedioPago;
  total: number;
  estado: EstadoVenta;
};
