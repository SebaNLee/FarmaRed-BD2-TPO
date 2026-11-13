export function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`El campo ${field} es obligatorio.`);
  }

  return normalized;
}

export function nullable(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export function parseBoolean(value: string, field: string): boolean {
  const normalized = required(value, field).toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;

  throw new Error(`El campo ${field} debe ser True o False; se recibió "${value}".`);
}

export function parseNumber(value: string, field: string): number {
  const parsed = Number(required(value, field).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new Error(`El campo ${field} debe ser numérico; se recibió "${value}".`);
  }

  return parsed;
}

export function parseNonNegativeInteger(value: string, field: string): number {
  const parsed = parseNumber(value, field);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`El campo ${field} debe ser un entero no negativo.`);
  }

  return parsed;
}

export function parseDate(value: string, field: string): Date {
  const normalized = required(value, field);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`El campo ${field} debe tener formato YYYY-MM-DD.`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`El campo ${field} contiene una fecha inválida.`);
  }

  return date;
}

export function parseNullableDate(value: string, field: string): Date | null {
  return nullable(value) === null ? null : parseDate(value, field);
}

export function parseOneOf<T extends string>(value: string, field: string, allowedValues: readonly T[]): T {
  const normalized = required(value, field);

  if ((allowedValues as readonly string[]).includes(normalized)) {
    return normalized as T;
  }

  throw new Error(
    `El campo ${field} tiene un valor inválido: "${value}". Valores permitidos: ${allowedValues.join(", ")}.`,
  );
}
