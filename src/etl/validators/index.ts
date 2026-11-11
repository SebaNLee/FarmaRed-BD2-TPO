import type { FarmaRedData } from "../load-data.js";
import { validateIds } from "./validate-ids.js";
import { validateRelations } from "./validate-relations.js";

export class IntegrityValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Se encontraron ${issues.length} errores de integridad:\n- ${issues.join("\n- ")}`);
    this.name = "IntegrityValidationError";
  }
}

export function validateData(data: FarmaRedData): void {
  const issues = [...validateIds(data), ...validateRelations(data)];

  if (issues.length > 0) {
    throw new IntegrityValidationError(issues);
  }
}
