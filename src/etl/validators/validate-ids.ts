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
  return findDuplicateIds(items).map((id) => `${entityName}: ID duplicado "${id}".`);
}

export function validateIds(data: FarmaRedData): string[] {
  return [
    ...validateUniqueIds("Clientes", data.clientes),
    ...validateUniqueIds("Proveedores", data.proveedores),
    ...validateUniqueIds("Productos", data.productos),
    ...validateUniqueIds("Sucursales", data.sucursales),
    ...validateUniqueIds("Farmacéuticos", data.farmaceuticos),
    ...validateUniqueIds("Recetas", data.recetas),
    ...validateUniqueIds("Lotes de stock", data.lotesStock),
    ...validateUniqueIds("Ventas", data.ventas),
    ...validateUniqueIds("Detalles de venta", data.detallesVenta),
  ];
}
