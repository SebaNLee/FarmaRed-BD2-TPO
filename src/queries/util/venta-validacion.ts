import type { OperacionVentaRepository } from "../../repositories/mongo/operacion-venta-repository.js";
import type { MedioPago } from "../../models/venta.js";
import type { Receta } from "../../models/receta.js";
import type { RegistrarVentaInput, VentaPreparada } from "./types.js";

const mediosPago: readonly MedioPago[] = ["Efectivo", "Débito", "Crédito", "Transferencia", "Obra social"];

export class ValidacionError extends Error {}

export function aplicarDispensa(receta: Receta, fechaVenta: Date): Receta {
  const nuevasDispensas = receta.dispensasRealizadas + 1;

  if (nuevasDispensas > receta.dispensasAutorizadas) {
    throw new ValidacionError(`La receta ${receta.id} no tiene dispensas disponibles.`);
  }

  if (receta.tipo === "Tratamiento prolongado" && nuevasDispensas < receta.dispensasAutorizadas) {
    return {
      ...receta,
      dispensasRealizadas: nuevasDispensas,
      estado: "Vigente",
      proximaDispensa: new Date(fechaVenta.getTime() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  return {
    ...receta,
    dispensasRealizadas: nuevasDispensas,
    estado: "Completada",
    proximaDispensa: null,
  };
}

export async function validarYPrepararVenta(
  input: RegistrarVentaInput,
  ventaId: string,
  repository: OperacionVentaRepository,
): Promise<VentaPreparada> {
  if (!mediosPago.includes(input.medioPago)) {
    throw new ValidacionError(`Medio de pago inválido: ${input.medioPago}`);
  }

  if (input.items.length === 0) {
    throw new ValidacionError("La venta debe tener al menos un ítem.");
  }

  const cliente = await repository.findCliente(input.clienteId);
  if (cliente === null || !cliente.activo) {
    throw new ValidacionError(`Cliente inexistente o inactivo: ${input.clienteId}`);
  }

  const farmaceutico = await repository.findFarmaceutico(input.farmaceuticoId);
  if (farmaceutico === null || !farmaceutico.activo) {
    throw new ValidacionError(`Farmacéutico inexistente o inactivo: ${input.farmaceuticoId}`);
  }

  const sucursal = await repository.findSucursal(farmaceutico.sucursalId);
  if (sucursal === null || sucursal.tipo !== "Farmacia" || !sucursal.activo) {
    throw new ValidacionError(`La sucursal ${farmaceutico.sucursalId} no es una farmacia activa.`);
  }

  const productoIds = input.items.map((item) => item.productoId);
  if (new Set(productoIds).size !== productoIds.length) {
    throw new ValidacionError("El detalle contiene productos duplicados.");
  }

  const productos = await repository.findProductos(productoIds);
  if (productos.length !== productoIds.length) {
    const encontrados = new Set(productos.map((producto) => producto._id));
    const faltantes = productoIds.filter((id) => !encontrados.has(id));
    throw new ValidacionError(`Productos inexistentes: ${faltantes.join(", ")}`);
  }

  const productosPorId = new Map(productos.map((producto) => [producto._id, producto]));

  const items = input.items.map((item) => {
    if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
      throw new ValidacionError(`Cantidad inválida para ${item.productoId}.`);
    }

    const producto = productosPorId.get(item.productoId);
    if (producto === undefined) {
      throw new ValidacionError(`Producto inexistente: ${item.productoId}`);
    }

    if (!producto.activo) {
      throw new ValidacionError(`Producto inactivo: ${item.productoId}`);
    }

    return {
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: producto.precioUnitario,
    };
  });

  const total = items.reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0);
  const requiereReceta = productos.some(
    (producto) => producto.condicionVenta === "Bajo receta" || producto.condicionVenta === "Bajo receta archivada",
  );

  let recetaAntes = null;
  let recetaDespues = null;

  if (requiereReceta) {
    if (input.recetaId === undefined || input.recetaId === null) {
      throw new ValidacionError("La venta requiere una receta.");
    }

    recetaAntes = await repository.findReceta(input.recetaId);

    if (recetaAntes === null) {
      throw new ValidacionError(`Receta inexistente: ${input.recetaId}`);
    }

    if (recetaAntes.clienteId !== input.clienteId) {
      throw new ValidacionError("La receta no pertenece al cliente de la venta.");
    }

    if (recetaAntes.estado !== "Vigente") {
      throw new ValidacionError(`La receta ${recetaAntes.id} no está vigente.`);
    }

    if (recetaAntes.dispensasRealizadas >= recetaAntes.dispensasAutorizadas) {
      throw new ValidacionError(`La receta ${recetaAntes.id} no tiene dispensas disponibles.`);
    }

    recetaDespues = aplicarDispensa(recetaAntes, new Date());
  } else if (input.recetaId !== undefined && input.recetaId !== null) {
    throw new ValidacionError("Una venta libre no debe tener receta.");
  }

  const fecha = new Date();
  const venta = {
    id: ventaId,
    clienteId: input.clienteId,
    farmaceuticoId: input.farmaceuticoId,
    recetaId: input.recetaId ?? null,
    fecha,
    tipo: requiereReceta ? ("Con receta" as const) : ("Venta libre" as const),
    medioPago: input.medioPago,
    total,
    estado: "Completada" as const,
    detalles: items.map((item, index) => ({
      id: `${ventaId}-D${index + 1}`,
      ventaId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    })),
  };

  return {
    ventaId,
    venta,
    sucursalId: farmaceutico.sucursalId,
    recetaAntes,
    recetaDespues,
  };
}
