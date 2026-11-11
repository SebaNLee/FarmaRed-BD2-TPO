import type { CargoFarmaceutico, Farmaceutico } from "../../models/farmaceutico.js";
import { parseBoolean, parseOneOf, required } from "./shared.js";

export type FarmaceuticoCsvRow = {
  id_farmaceutico: string;
  nombre: string;
  apellido: string;
  matricula: string;
  cargo: string;
  id_sucursal: string;
  activo: string;
};

const cargosFarmaceutico = ["Director Técnico", "Farmacéutico"] as const satisfies readonly CargoFarmaceutico[];

export function parseFarmaceutico(row: FarmaceuticoCsvRow): Farmaceutico {
  return {
    id: required(row.id_farmaceutico, "id_farmaceutico"),
    nombre: required(row.nombre, "nombre"),
    apellido: required(row.apellido, "apellido"),
    matricula: required(row.matricula, "matricula"),
    cargo: parseOneOf(row.cargo, "cargo", cargosFarmaceutico),
    sucursalId: required(row.id_sucursal, "id_sucursal"),
    activo: parseBoolean(row.activo, "activo"),
  };
}
