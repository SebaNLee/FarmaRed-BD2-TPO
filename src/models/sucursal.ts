export type TipoSucursal = "Farmacia" | "Droguería";

export type Sucursal = {
  id: string;
  nombre: string;
  tipo: TipoSucursal;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  activo: boolean;
};
