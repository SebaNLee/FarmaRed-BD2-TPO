export type CargoFarmaceutico = "Director Técnico" | "Farmacéutico";

export type Farmaceutico = {
  id: string;
  nombre: string;
  apellido: string;
  matricula: string;
  cargo: CargoFarmaceutico;
  sucursalId: string;
  activo: boolean;
};
