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
      errors.push(`Producto ${producto.id}: proveedor inexistente "${producto.proveedorId}".`);
    }
  }

  for (const farmaceutico of data.farmaceuticos) {
    if (!sucursalIds.has(farmaceutico.sucursalId)) {
      errors.push(`Farmacéutico ${farmaceutico.id}: sucursal inexistente "${farmaceutico.sucursalId}".`);
    }
  }

  for (const receta of data.recetas) {
    if (!clienteIds.has(receta.clienteId)) {
      errors.push(`Receta ${receta.id}: cliente inexistente "${receta.clienteId}".`);
    }
  }

  for (const lote of data.lotesStock) {
    if (!productoIds.has(lote.productoId)) {
      errors.push(`Lote ${lote.id}: producto inexistente "${lote.productoId}".`);
    }

    if (!sucursalIds.has(lote.sucursalId)) {
      errors.push(`Lote ${lote.id}: sucursal inexistente "${lote.sucursalId}".`);
    }
  }

  for (const venta of data.ventas) {
    if (!clienteIds.has(venta.clienteId)) {
      errors.push(`Venta ${venta.id}: cliente inexistente "${venta.clienteId}".`);
    }

    if (!farmaceuticoIds.has(venta.farmaceuticoId)) {
      errors.push(`Venta ${venta.id}: farmacéutico inexistente "${venta.farmaceuticoId}".`);
    }

    if (venta.recetaId !== null && !recetaIds.has(venta.recetaId)) {
      errors.push(`Venta ${venta.id}: receta inexistente "${venta.recetaId}".`);
    }
  }

  for (const detalle of data.detallesVenta) {
    if (!ventaIds.has(detalle.ventaId)) {
      errors.push(`Detalle ${detalle.id}: venta inexistente "${detalle.ventaId}".`);
    }

    if (!productoIds.has(detalle.productoId)) {
      errors.push(`Detalle ${detalle.id}: producto inexistente "${detalle.productoId}".`);
    }
  }

  return errors;
}
