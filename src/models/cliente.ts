export type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  ciudad: string;
  provincia: string;
  obraSocial: string;
  nroAfiliado: string | null;
  activo: boolean;
};
