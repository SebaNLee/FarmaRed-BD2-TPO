import type { CondicionVenta } from "../../models/producto.js";
import type { TipoProveedor } from "../../models/proveedor.js";

export type ProductosActivosByBucketRow = {
  bucket: 0; // esto noc q one, se podria usar mas pero cuanto es medio arbitrario
  productoId: string;
  productoNombre: string;
  principioActivo: string;
  categoria: string;
  presentacion: string;
  condicionVenta: CondicionVenta;
  precioUnitario: number;
  proveedorId: string;
  proveedorRazonSocial: string;
  proveedorCuit: string;
  proveedorTipo: TipoProveedor;
  proveedorCiudad: string;
  proveedorProvincia: string;
  proveedorTelefono: string;
  proveedorActivo: boolean;
};
