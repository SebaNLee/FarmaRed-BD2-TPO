export function required(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`Field ${field} is required.`);
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

  throw new Error(`Field ${field} must be True or False; received "${value}".`);
}

export function parseNumber(value: string, field: string): number {
  const parsed = Number(required(value, field).replace(",", "."));

  if (!Number.isFinite(parsed)) {
    throw new Error(`Field ${field} must be numeric; received "${value}".`);
  }

  return parsed;
}

export function parseNonNegativeInteger(value: string, field: string): number {
  const parsed = parseNumber(value, field);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Field ${field} must be a non-negative integer.`);
  }

  return parsed;
}

export function parseDate(value: string, field: string): Date {
  const normalized = required(value, field);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`Field ${field} must use YYYY-MM-DD format.`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`Field ${field} contains an invalid date.`);
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

  throw new Error(`Field ${field} has an invalid value: "${value}". Allowed values: ${allowedValues.join(", ")}.`);
}
