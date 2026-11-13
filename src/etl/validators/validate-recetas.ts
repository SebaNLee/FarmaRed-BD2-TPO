import type { FarmaRedData } from "../load-data.js";

export function validateRecetas(data: FarmaRedData): string[] {
  const issues: string[] = [];

  for (const receta of data.recetas) {
    if (receta.dispensasRealizadas > receta.dispensasAutorizadas) {
      issues.push(
        `Receta ${receta.id}: dispensas realizadas (${receta.dispensasRealizadas}) superan las autorizadas (${receta.dispensasAutorizadas}).`,
      );
    }

    if (receta.estado === "Completada" && receta.proximaDispensa !== null) {
      issues.push(`Receta ${receta.id}: está completada pero tiene próxima dispensa.`);
    }
  }

  return issues;
}
