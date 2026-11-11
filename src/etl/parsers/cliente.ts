import type { Cliente } from "../../models/cliente.js";
import { nullable, parseBoolean, required } from "./shared.js";

export type ClienteCsvRow = {
  id_cliente: string;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  ciudad: string;
  provincia: string;
  obra_social: string;
  nro_afiliado: string;
  activo: string;
};

export function parseCliente(row: ClienteCsvRow): Cliente {
  return {
    id: required(row.id_cliente, "id_cliente"),
    nombre: required(row.nombre, "nombre"),
    apellido: required(row.apellido, "apellido"),
    dni: required(row.dni, "dni"),
    email: required(row.email, "email"),
    telefono: required(row.telefono, "telefono"),
    ciudad: required(row.ciudad, "ciudad"),
    provincia: required(row.provincia, "provincia"),
    obraSocial: required(row.obra_social, "obra_social"),
    nroAfiliado: nullable(row.nro_afiliado),
    activo: parseBoolean(row.activo, "activo"),
  };
}
