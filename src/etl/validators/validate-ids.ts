import type { FarmaRedData } from "../load-data.js";

type Identifiable = { id: string };

function findDuplicateIds(items: Identifiable[]): string[] {
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();

  for (const item of items) {
    if (seenIds.has(item.id)) {
      duplicateIds.add(item.id);
    }

    seenIds.add(item.id);
  }

  return [...duplicateIds];
}

function validateUniqueIds(entityName: string, items: Identifiable[]): string[] {
  return findDuplicateIds(items).map((id) => `${entityName}: duplicate ID "${id}".`);
}

export function validateIds(data: FarmaRedData): string[] {
  return [
    ...validateUniqueIds("Clients", data.clientes),
    ...validateUniqueIds("Providers", data.proveedores),
    ...validateUniqueIds("Products", data.productos),
    ...validateUniqueIds("Branches", data.sucursales),
    ...validateUniqueIds("Pharmacists", data.farmaceuticos),
    ...validateUniqueIds("Prescriptions", data.recetas),
    ...validateUniqueIds("Stock lots", data.lotesStock),
    ...validateUniqueIds("Sales", data.ventas),
    ...validateUniqueIds("Sale details", data.detallesVenta),
  ];
}
