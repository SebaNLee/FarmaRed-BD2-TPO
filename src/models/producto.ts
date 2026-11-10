export type CondicionVenta = "Venta libre" | "Bajo receta" | "Bajo receta archivada";

export type Producto = {
  id: string;
  nombre: string;
  principioActivo: string;
  categoria: string;
  presentacion: string;
  condicionVenta: CondicionVenta;
  precioUnitario: number;
  proveedorId: string;
  activo: boolean;
};
