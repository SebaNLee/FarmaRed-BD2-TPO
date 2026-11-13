import type { FarmaRedData } from "../load-data.js";

function findDuplicateValues<T extends object>(items: T[], key: keyof T & string): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();

  for (const item of items) {
    const value = String(item[key] ?? "");

    if (!value) {
      continue;
    }

    if (seen.has(value)) {
      duplicated.add(value);
    }

    seen.add(value);
  }

  return [...duplicated];
}

export function validateUniqueKeys(data: FarmaRedData): string[] {
  return [
    ...findDuplicateValues(data.clientes, "dni").map((dni) => `Clientes: DNI duplicado "${dni}".`),
    ...findDuplicateValues(data.farmaceuticos, "matricula").map(
      (matricula) => `Farmacéuticos: matrícula duplicada "${matricula}".`,
    ),
    ...findDuplicateValues(data.proveedores, "cuit").map((cuit) => `Proveedores: CUIT duplicado "${cuit}".`),
  ];
}
