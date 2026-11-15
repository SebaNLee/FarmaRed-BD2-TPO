import type { OperacionVentaRepository } from "../repositories/mongo/operacion-venta-repository.js";
import type { StockSaga } from "./util/stock-saga.js";
import { compensarOperacion } from "./util/stock-saga.js";
import type { ResultadoStock } from "./util/types.js";

export type ActualizarStockDependencies = {
  operaciones: OperacionVentaRepository;
  stockSaga: StockSaga;
  workerId: string;
};

function resultadoError(mensaje: string): ResultadoStock {
  return { ok: false, codigo: "VALIDACION", errores: [mensaje] };
}

export async function actualizarStockVenta(
  ventaId: string,
  dependencies: ActualizarStockDependencies,
): Promise<ResultadoStock> {
  const venta = await dependencies.operaciones.findVenta(ventaId);

  if (venta === null) {
    return resultadoError(`Venta inexistente: ${ventaId}`);
  }

  if (venta.estado !== "Completada") {
    return resultadoError(`Solo las ventas Completada descuentan stock. Estado actual: ${venta.estado}`);
  }

  if (venta.detalles.length === 0) {
    return resultadoError(`La venta ${ventaId} no tiene ítems.`);
  }

  const farmaceutico = await dependencies.operaciones.findFarmaceutico(venta.farmaceuticoId);

  if (farmaceutico === null) {
    return resultadoError(`Farmacéutico inexistente: ${venta.farmaceuticoId}`);
  }

  let operacion = await dependencies.operaciones.findOperacion(ventaId);

  if (operacion === null) {
    operacion = await dependencies.operaciones.crearOperacion({
      id: ventaId,
    });
  }

  if (operacion.estado === "CONFIRMADA") {
    return {
      ok: true,
      ventaId,
      movimientos: await dependencies.stockSaga.findMovimientos(ventaId),
      yaAplicado: true,
    };
  }

  if (operacion.estado === "ABORTADA") {
    return {
      ok: false,
      codigo: "CONFLICTO",
      errores: [operacion.error ?? "La operación de stock fue abortada."],
    };
  }

  const bloqueo = await dependencies.operaciones.adquirirBloqueo(operacion.id, dependencies.workerId);

  if (bloqueo === null) {
    return {
      ok: false,
      codigo: "INDETERMINADO",
      ventaId,
      detalle: "La operación está siendo procesada por otro worker.",
    };
  }

  try {
    const actual = await dependencies.operaciones.findOperacion(operacion.id);

    if (actual === null) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId,
        detalle: "La operación desapareció.",
      };
    }

    if (actual.estado === "CONFIRMADA") {
      return {
        ok: true,
        ventaId,
        movimientos: await dependencies.stockSaga.findMovimientos(ventaId),
        yaAplicado: true,
      };
    }

    if (actual.estado === "ABORTADA") {
      return {
        ok: false,
        codigo: "CONFLICTO",
        errores: [actual.error ?? "La operación de stock fue abortada."],
      };
    }

    const movimientos = await dependencies.stockSaga.findMovimientos(ventaId);

    if (movimientos.some((movimiento) => movimiento.estado === "PENDIENTE")) {
      const detalle = "Existen movimientos PENDIENTE de un intento previo.";
      await dependencies.operaciones.registrarError(actual.id, detalle);
      return { ok: false, codigo: "INDETERMINADO", ventaId, detalle };
    }

    if (movimientos.some((movimiento) => movimiento.estado === "REVERTIDO")) {
      const detalle = "Existen movimientos REVERTIDO de un intento previo compensado.";
      await dependencies.operaciones.marcarAbortada(actual.id, detalle);
      return { ok: false, codigo: "CONFLICTO", errores: [detalle] };
    }

    if (movimientos.length > 0 && movimientos.every((movimiento) => movimiento.estado === "APLICADO")) {
      const confirmada = await dependencies.operaciones.marcarConfirmada(actual.id, bloqueo);

      if (!confirmada) {
        return {
          ok: false,
          codigo: "INDETERMINADO",
          ventaId,
          detalle: "El stock ya estaba aplicado pero no se pudo confirmar la operación.",
        };
      }

      return { ok: true, ventaId, movimientos, yaAplicado: true };
    }

    const stock = await dependencies.stockSaga.aplicarVenta(venta, farmaceutico.sucursalId);

    if (!stock.ok) {
      if (stock.codigo === "INDETERMINADO") {
        await dependencies.operaciones.registrarError(actual.id, stock.detalle);
        return stock;
      }

      const compensacion = await compensarOperacion(actual.id, dependencies);

      if (!compensacion.ok) {
        await dependencies.operaciones.registrarError(actual.id, compensacion.detalle);
        return {
          ok: false,
          codigo: "INDETERMINADO",
          ventaId,
          detalle: compensacion.detalle,
        };
      }

      await dependencies.operaciones.marcarAbortada(actual.id, stock.errores.join("; "));

      return {
        ok: false,
        codigo: stock.codigo,
        errores: stock.errores,
        faltantes: stock.faltantes,
      };
    }

    const confirmada = await dependencies.operaciones.marcarConfirmada(actual.id, bloqueo);

    if (!confirmada) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId,
        detalle: "El stock se aplicó pero no se pudo confirmar la operación.",
      };
    }

    return {
      ok: true,
      ventaId,
      movimientos: stock.movimientos,
      yaAplicado: false,
    };
  } finally {
    await dependencies.operaciones.liberarBloqueo(operacion.id, bloqueo);
  }
}
