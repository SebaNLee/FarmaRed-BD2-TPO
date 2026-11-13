import type { FarmaRedData } from "../load-data.js";
import { validateIds } from "./validate-ids.js";
import { validateRecetas } from "./validate-recetas.js";
import { validateRelations } from "./validate-relations.js";
import { validateSaleTotals } from "./validate-totals.js";
import { validateUniqueKeys } from "./validate-unique-keys.js";

export class IntegrityValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Found ${issues.length} integrity errors:\n- ${issues.join("\n- ")}`);
    this.name = "IntegrityValidationError";
  }
}

export function validateData(data: FarmaRedData): void {
  const issues = [
    ...validateIds(data),
    ...validateUniqueKeys(data),
    ...validateRelations(data),
    ...validateSaleTotals(data),
    ...validateRecetas(data),
  ];

  if (issues.length > 0) {
    throw new IntegrityValidationError(issues);
  }
}
