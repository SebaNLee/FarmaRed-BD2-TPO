export type TipoProveedor = "Laboratorio" | "Droguería";

export type Proveedor = {
  id: string;
  razonSocial: string;
  cuit: string;
  tipo: TipoProveedor;
  ciudad: string;
  provincia: string;
  telefono: string;
  activo: boolean;
};
