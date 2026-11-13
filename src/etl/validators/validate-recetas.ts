import type { FarmaRedData } from "../load-data.js";

export function validateRecetas(data: FarmaRedData): string[] {
  const issues: string[] = [];

  for (const receta of data.recetas) {
    if (receta.dispensasRealizadas > receta.dispensasAutorizadas) {
      issues.push(
        `Prescription ${receta.id}: dispensed refills (${receta.dispensasRealizadas}) exceed authorized refills (${receta.dispensasAutorizadas}).`,
      );
    }

    if (receta.estado === "Completada" && receta.proximaDispensa !== null) {
      issues.push(`Prescription ${receta.id}: is completed but has a next dispensing date.`);
    }
  }

  return issues;
}
