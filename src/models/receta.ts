export type TipoReceta = "Simple" | "Tratamiento prolongado" | "Archivada";

export type EstadoReceta = "Vigente" | "Completada" | "Vencida";

export type Receta = {
  id: string;
  clienteId: string;
  medico: string;
  matriculaMedico: string;
  fechaEmision: Date;
  tipo: TipoReceta;
  dispensasAutorizadas: number;
  dispensasRealizadas: number;
  proximaDispensa: Date | null;
  estado: EstadoReceta;
};
