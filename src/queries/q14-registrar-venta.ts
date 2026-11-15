import type { OperacionVenta } from "../models/operacion-venta.js";
import type { VentaConDetalles } from "../models/venta-con-detalles.js";
import type { CounterRepository } from "../repositories/mongo/counter-repository.js";
import type { OperacionVentaRepository } from "../repositories/mongo/operacion-venta-repository.js";
import type { StockSaga } from "./util/stock-saga.js";
import { compensarOperacion } from "./util/stock-saga.js";
import type { RegistrarVentaInput, ResultadoStock, ResultadoVenta, VentaPreparada } from "./util/types.js";
import { validarYPrepararVenta, ValidacionError } from "./util/venta-validacion.js";

export type RegistrarVentaDependencies = {
  operaciones: OperacionVentaRepository;
  stockSaga: StockSaga;
  counters: CounterRepository;
  workerId: string;
};

function resultadoStockAFallo(resultado: Extract<ResultadoStock, { ok: false }>): ResultadoVenta {
  if (resultado.codigo === "INDETERMINADO") {
    return resultado;
  }

  return {
    ok: false,
    codigo: resultado.codigo,
    errores: resultado.errores,
    faltantes: resultado.faltantes,
  };
}

function errorValidacion(error: unknown): string[] {
  if (error instanceof ValidacionError) {
    return [error.message];
  }

  return [error instanceof Error ? error.message : String(error)];
}

async function resultadoTerminal(
  operacion: OperacionVenta,
  dependencies: RegistrarVentaDependencies,
): Promise<ResultadoVenta | null> {
  if (operacion.estado === "CONFIRMADA") {
    const venta = await dependencies.operaciones.findVenta(operacion.id);

    if (venta === null) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId: operacion.id,
        detalle: "La operación está CONFIRMADA pero la venta no existe.",
      };
    }

    return { ok: true, venta, idempotente: true };
  }

  if (operacion.estado === "ABORTADA") {
    return {
      ok: false,
      codigo: "VALIDACION",
      errores: [operacion.error ?? "La operación fue abortada."],
    };
  }

  return null;
}

export async function registrarVenta(
  input: RegistrarVentaInput,
  dependencies: RegistrarVentaDependencies,
): Promise<ResultadoVenta> {
  const requestedVentaId = input.ventaId?.trim();
  const ventaId =
    requestedVentaId !== undefined && requestedVentaId.length > 0
      ? requestedVentaId
      : await dependencies.counters.nextId("ventas");

  let operacion = await dependencies.operaciones.findOperacion(ventaId);
  let preparada: VentaPreparada;

  if (operacion !== null) {
    const terminal = await resultadoTerminal(operacion, dependencies);
    if (terminal !== null) {
      return terminal;
    }

    try {
      preparada = await validarYPrepararVenta(input, operacion.id, dependencies.operaciones);
    } catch (error) {
      return { ok: false, codigo: "VALIDACION", errores: errorValidacion(error) };
    }
  } else {
    const ventaExistente = await dependencies.operaciones.findVenta(ventaId);

    if (ventaExistente !== null) {
      return {
        ok: false,
        codigo: "VALIDACION",
        errores: [`Ya existe una venta con el ID ${ventaId}.`],
      };
    }

    try {
      preparada = await validarYPrepararVenta(input, ventaId, dependencies.operaciones);
    } catch (error) {
      return { ok: false, codigo: "VALIDACION", errores: errorValidacion(error) };
    }

    operacion = await dependencies.operaciones.crearOperacion({
      id: preparada.ventaId,
    });

    const terminal = await resultadoTerminal(operacion, dependencies);
    if (terminal !== null) {
      return terminal;
    }
  }

  const bloqueo = await dependencies.operaciones.adquirirBloqueo(operacion.id, dependencies.workerId);

  if (bloqueo === null) {
    return {
      ok: false,
      codigo: "INDETERMINADO",
      ventaId: operacion.id,
      detalle: "La operación está siendo procesada por otro worker.",
    };
  }

  try {
    const actual = await dependencies.operaciones.findOperacion(operacion.id);

    if (actual === null) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId: operacion.id,
        detalle: "La operación desapareció.",
      };
    }

    const terminal = await resultadoTerminal(actual, dependencies);
    if (terminal !== null) {
      return terminal;
    }

    const ventaExistente = await dependencies.operaciones.findVenta(actual.id);

    if (ventaExistente !== null) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId: actual.id,
        detalle: "La venta ya existe pero la operación sigue PENDIENTE.",
      };
    }

    const movimientos = await dependencies.stockSaga.findMovimientos(actual.id);

    if (movimientos.some((movimiento) => movimiento.estado === "PENDIENTE")) {
      const detalle = "Existen movimientos PENDIENTE de un intento previo.";
      await dependencies.operaciones.registrarError(actual.id, detalle);
      return { ok: false, codigo: "INDETERMINADO", ventaId: actual.id, detalle };
    }

    if (movimientos.some((movimiento) => movimiento.estado === "REVERTIDO")) {
      const detalle = "Existen movimientos REVERTIDO de un intento previo compensado.";
      await dependencies.operaciones.marcarAbortada(actual.id, detalle);
      return { ok: false, codigo: "CONFLICTO", errores: [detalle] };
    }

    const todosAplicados = movimientos.length > 0 && movimientos.every((m) => m.estado === "APLICADO");

    if (!todosAplicados) {
      const stock = await dependencies.stockSaga.aplicarVenta(preparada.venta, preparada.sucursalId);

      if (!stock.ok) {
        if (stock.codigo === "INDETERMINADO") {
          await dependencies.operaciones.registrarError(actual.id, stock.detalle);
          return resultadoStockAFallo(stock);
        }

        const compensacion = await compensarOperacion(actual.id, dependencies);

        if (!compensacion.ok) {
          await dependencies.operaciones.registrarError(actual.id, compensacion.detalle);
          return {
            ok: false,
            codigo: "INDETERMINADO",
            ventaId: actual.id,
            detalle: compensacion.detalle,
          };
        }

        const detalle = stock.errores.join("; ");
        await dependencies.operaciones.marcarAbortada(actual.id, detalle);

        return resultadoStockAFallo(stock);
      }
    }

    try {
      await dependencies.operaciones.commitFinal(preparada, actual.id, bloqueo);
      return { ok: true, venta: preparada.venta, idempotente: false };
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);

      let venta: VentaConDetalles | null;

      try {
        venta = await dependencies.operaciones.findVenta(actual.id);
      } catch (verificacionError) {
        const detalleVerificacion =
          verificacionError instanceof Error ? verificacionError.message : String(verificacionError);
        const mensaje = `Commit ambiguo y no se pudo verificar la venta: ${detalleVerificacion}`;
        await dependencies.operaciones.registrarError(actual.id, mensaje);
        return { ok: false, codigo: "INDETERMINADO", ventaId: actual.id, detalle: mensaje };
      }

      if (venta !== null) {
        const operacionActual = await dependencies.operaciones.findOperacion(actual.id);

        if (operacionActual?.estado === "CONFIRMADA") {
          return { ok: true, venta, idempotente: true };
        }

        return {
          ok: false,
          codigo: "INDETERMINADO",
          ventaId: actual.id,
          detalle: "La venta existe pero la operación no está CONFIRMADA.",
        };
      }

      if (detalle === "BLOQUEO_PERDIDO") {
        await dependencies.operaciones.registrarError(
          actual.id,
          "Se perdió el bloqueo de la operación durante el commit.",
        );
        return {
          ok: false,
          codigo: "INDETERMINADO",
          ventaId: actual.id,
          detalle: "Se perdió el bloqueo de la operación durante el commit.",
        };
      }

      const compensacion = await compensarOperacion(actual.id, dependencies);

      if (!compensacion.ok) {
        await dependencies.operaciones.registrarError(actual.id, compensacion.detalle);
        return {
          ok: false,
          codigo: "INDETERMINADO",
          ventaId: actual.id,
          detalle: compensacion.detalle,
        };
      }

      await dependencies.operaciones.marcarAbortada(actual.id, detalle);

      if (detalle === "CONFLICTO_RECETA") {
        return {
          ok: false,
          codigo: "CONFLICTO",
          errores: ["La receta fue modificada por otra venta concurrente."],
        };
      }

      return { ok: false, codigo: "ERROR_INTERNO", errores: [detalle] };
    }
  } finally {
    await dependencies.operaciones.liberarBloqueo(operacion.id, bloqueo);
  }
}
