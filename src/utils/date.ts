import dayjs from "dayjs";

export function today(): string {
  return dayjs().format("YYYY-MM-DD");
}

export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromDateOnlyString(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
