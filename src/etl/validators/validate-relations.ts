import type { FarmaRedData } from "../load-data.js";

function idsOf(items: Array<{ id: string }>): Set<string> {
  return new Set(items.map((item) => item.id));
}

export function validateRelations(data: FarmaRedData): string[] {
  const proveedorIds = idsOf(data.proveedores);
  const sucursalIds = idsOf(data.sucursales);
  const clienteIds = idsOf(data.clientes);
  const productoIds = idsOf(data.productos);
  const recetaIds = idsOf(data.recetas);
  const farmaceuticoIds = idsOf(data.farmaceuticos);
  const ventaIds = idsOf(data.ventas);
  const errors: string[] = [];

  for (const producto of data.productos) {
    if (!proveedorIds.has(producto.proveedorId)) {
      errors.push(`Product ${producto.id}: provider "${producto.proveedorId}" does not exist.`);
    }
  }

  for (const farmaceutico of data.farmaceuticos) {
    if (!sucursalIds.has(farmaceutico.sucursalId)) {
      errors.push(`Pharmacist ${farmaceutico.id}: branch "${farmaceutico.sucursalId}" does not exist.`);
    }
  }

  for (const receta of data.recetas) {
    if (!clienteIds.has(receta.clienteId)) {
      errors.push(`Prescription ${receta.id}: client "${receta.clienteId}" does not exist.`);
    }
  }

  for (const lote of data.lotesStock) {
    if (!productoIds.has(lote.productoId)) {
      errors.push(`Lot ${lote.id}: product "${lote.productoId}" does not exist.`);
    }

    if (!sucursalIds.has(lote.sucursalId)) {
      errors.push(`Lot ${lote.id}: branch "${lote.sucursalId}" does not exist.`);
    }
  }

  for (const venta of data.ventas) {
    if (!clienteIds.has(venta.clienteId)) {
      errors.push(`Sale ${venta.id}: client "${venta.clienteId}" does not exist.`);
    }

    if (!farmaceuticoIds.has(venta.farmaceuticoId)) {
      errors.push(`Sale ${venta.id}: pharmacist "${venta.farmaceuticoId}" does not exist.`);
    }

    if (venta.recetaId !== null && !recetaIds.has(venta.recetaId)) {
      errors.push(`Sale ${venta.id}: prescription "${venta.recetaId}" does not exist.`);
    }
  }

  for (const detalle of data.detallesVenta) {
    if (!ventaIds.has(detalle.ventaId)) {
      errors.push(`Sale detail ${detalle.id}: sale "${detalle.ventaId}" does not exist.`);
    }

    if (!productoIds.has(detalle.productoId)) {
      errors.push(`Sale detail ${detalle.id}: product "${detalle.productoId}" does not exist.`);
    }
  }

  return errors;
}
