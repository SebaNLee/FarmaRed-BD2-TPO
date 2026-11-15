import type { LoteStock } from "../../models/lote.stock.js";
import type { MovimientoStock } from "../../models/stock-movimiento.js";
import type { VentaConDetalles } from "../../models/venta-con-detalles.js";
import type { CassandraStockRepository } from "../../repositories/cassandra/stock-repository.js";
import type { OperacionVentaRepository } from "../../repositories/mongo/operacion-venta-repository.js";
import type { FaltanteStock, ResultadoStock } from "./types.js";
import { today } from "../../utils/date.js";

const MAX_INTENTOS_PRODUCTO = 6;
const MAX_INTENTOS_CAS = 6;
const MAX_INTENTOS_COMPENSACION = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function backoff(intento: number): number {
  return Math.min(25 * 2 ** intento, 500);
}

export class IndeterminadoError extends Error {}

function agruparCantidades(venta: VentaConDetalles): Map<string, number> {
  const cantidades = new Map<string, number>();

  for (const detalle of venta.detalles) {
    cantidades.set(detalle.productoId, (cantidades.get(detalle.productoId) ?? 0) + detalle.cantidad);
  }

  return cantidades;
}

export class StockSaga {
  constructor(private readonly repository: CassandraStockRepository) {}

  findMovimientos(ventaId: string): Promise<MovimientoStock[]> {
    return this.repository.findMovimientosByVenta(ventaId);
  }

  async aplicarVenta(venta: VentaConDetalles, sucursalId: string): Promise<ResultadoStock> {
    const existentes = await this.repository.findMovimientosByVenta(venta.id);

    if (existentes.some((movimiento) => movimiento.estado === "PENDIENTE")) {
      return {
        ok: false,
        codigo: "INDETERMINADO",
        ventaId: venta.id,
        detalle: "Existen movimientos PENDIENTE de un intento previo.",
      };
    }

    if (existentes.some((movimiento) => movimiento.estado === "REVERTIDO")) {
      return {
        ok: false,
        codigo: "CONFLICTO",
        errores: ["Existen movimientos REVERTIDO de un intento previo compensado."],
      };
    }

    const aplicados = existentes.filter((movimiento) => movimiento.estado === "APLICADO");
    const aplicadosPorProducto = new Map<string, number>();
    const lotesAplicados = new Set<string>();

    for (const movimiento of aplicados) {
      aplicadosPorProducto.set(
        movimiento.productoId,
        (aplicadosPorProducto.get(movimiento.productoId) ?? 0) + movimiento.cantidad,
      );
      lotesAplicados.add(movimiento.loteId);
    }

    const cantidades = agruparCantidades(venta);
    const nuevos: MovimientoStock[] = [];

    for (const [productoId, cantidad] of cantidades) {
      const yaAplicado = aplicadosPorProducto.get(productoId) ?? 0;
      const restante = cantidad - yaAplicado;

      if (restante <= 0) {
        continue;
      }

      const resultado = await this.aplicarProducto(venta.id, sucursalId, productoId, restante, lotesAplicados);

      if (!resultado.ok) {
        return resultado;
      }

      nuevos.push(...resultado.movimientos);
    }

    if (aplicados.length > 0 && nuevos.length === 0) {
      return {
        ok: true,
        ventaId: venta.id,
        movimientos: aplicados,
        yaAplicado: true,
      };
    }

    return {
      ok: true,
      ventaId: venta.id,
      movimientos: [...aplicados, ...nuevos],
      yaAplicado: false,
    };
  }

  private async aplicarProducto(
    ventaId: string,
    sucursalId: string,
    productoId: string,
    cantidad: number,
    lotesAplicados: Set<string>,
  ): Promise<
    | { ok: true; movimientos: MovimientoStock[] }
    | { ok: false; codigo: "STOCK_INSUFICIENTE"; errores: string[]; faltantes: FaltanteStock[] }
    | { ok: false; codigo: "CONFLICTO"; errores: string[] }
    | { ok: false; codigo: "INDETERMINADO"; ventaId: string; detalle: string }
  > {
    let restante = cantidad;
    const movimientos: MovimientoStock[] = [];
    const lotesDescartados = new Set<string>();
    let intentos = 0;

    while (restante > 0) {
      if (++intentos > MAX_INTENTOS_PRODUCTO) {
        return {
          ok: false,
          codigo: "CONFLICTO",
          errores: [`No se pudo asignar stock para ${productoId} después de ${MAX_INTENTOS_PRODUCTO} intentos.`],
        };
      }

      const todosLosLotes = (await this.repository.findLotesFEFO(sucursalId, productoId, today())).filter(
        (lote) => lote.unidades > 0 && !lotesAplicados.has(lote.id),
      );

      const lotes = todosLosLotes.filter((lote) => !lotesDescartados.has(lote.id));
      const disponible = lotes.reduce((acc, lote) => acc + lote.unidades, 0);

      if (disponible < restante) {
        const disponibleTotal = todosLosLotes.reduce((acc, lote) => acc + lote.unidades, 0);

        if (lotes.length === 0 && disponibleTotal >= restante) {
          return {
            ok: false,
            codigo: "CONFLICTO",
            errores: [`No se pudo aplicar stock para ${productoId} por conflictos concurrentes.`],
          };
        }

        return {
          ok: false,
          codigo: "STOCK_INSUFICIENTE",
          errores: [`Stock insuficiente para ${productoId}.`],
          faltantes: [{ productoId, solicitado: restante, disponible: disponibleTotal }],
        };
      }

      let progreso = false;

      for (const lote of lotes) {
        const tomar = Math.min(lote.unidades, restante);
        const resultado = await this.aplicarAsignacion(ventaId, sucursalId, productoId, lote, tomar);

        if (resultado.ok) {
          movimientos.push(resultado.movimiento);
          lotesAplicados.add(lote.id);
          restante -= tomar;
          progreso = true;

          if (restante === 0) {
            break;
          }
        } else if (resultado.codigo === "INDETERMINADO") {
          return {
            ok: false,
            codigo: "INDETERMINADO",
            ventaId,
            detalle: resultado.detalle,
          };
        } else {
          lotesDescartados.add(lote.id);
        }
      }

      if (!progreso && restante > 0) {
        await sleep(backoff(intentos));
      }
    }

    return { ok: true, movimientos };
  }

  private async aplicarAsignacion(
    ventaId: string,
    sucursalId: string,
    productoId: string,
    lote: LoteStock,
    cantidad: number,
  ): Promise<
    | { ok: true; movimiento: MovimientoStock }
    | { ok: false; codigo: "CONFLICTO"; detalle: string }
    | { ok: false; codigo: "INDETERMINADO"; detalle: string }
  > {
    const unidadesAntes = lote.unidades;
    const unidadesDespues = unidadesAntes - cantidad;
    const actualizadoEn = new Date();

    const claimed = await this.repository.claimMovimiento({
      ventaId,
      loteId: lote.id,
      sucursalId,
      productoId,
      vencimiento: lote.vencimiento,
      cantidad,
      unidadesAntes,
      unidadesDespues,
      actualizadoEn,
    });

    if (!claimed) {
      const existente = await this.repository.findMovimiento(ventaId, lote.id);

      if (existente === null) {
        return { ok: false, codigo: "CONFLICTO", detalle: `No se pudo reclamar el lote ${lote.id}.` };
      }

      if (existente.estado === "PENDIENTE") {
        return {
          ok: false,
          codigo: "INDETERMINADO",
          detalle: `El movimiento del lote ${lote.id} quedó PENDIENTE.`,
        };
      }

      if (existente.estado === "APLICADO") {
        return { ok: false, codigo: "CONFLICTO", detalle: `El lote ${lote.id} ya estaba aplicado.` };
      }

      return { ok: false, codigo: "CONFLICTO", detalle: `El lote ${lote.id} fue revertido en un intento previo.` };
    }

    for (let intento = 1; intento <= MAX_INTENTOS_CAS; intento++) {
      const loteActual = await this.repository.findLote(sucursalId, productoId, lote.vencimiento, lote.id);

      if (loteActual === null || loteActual.unidades < cantidad) {
        await this.repository.transitionMovimiento(ventaId, lote.id, "PENDIENTE", "REVERTIDO");
        return { ok: false, codigo: "CONFLICTO", detalle: `El lote ${lote.id} ya no tiene unidades suficientes.` };
      }

      const unidadesAntesFinal = loteActual.unidades;
      const unidadesDespuesFinal = unidadesAntesFinal - cantidad;

      const actualizado = await this.repository.actualizarIntentoMovimiento(
        ventaId,
        lote.id,
        unidadesAntesFinal,
        unidadesDespuesFinal,
      );

      if (!actualizado) {
        return {
          ok: false,
          codigo: "INDETERMINADO",
          detalle: `No se pudo actualizar el intento del lote ${lote.id}.`,
        };
      }

      let applied: boolean;

      try {
        applied = await this.repository.decrementarLote(
          sucursalId,
          productoId,
          lote.vencimiento,
          lote.id,
          cantidad,
          unidadesAntesFinal,
        );
      } catch (error) {
        return {
          ok: false,
          codigo: "INDETERMINADO",
          detalle: error instanceof Error ? error.message : String(error),
        };
      }

      if (!applied) {
        await sleep(backoff(intento));
        continue;
      }

      const marked = await this.repository.marcarAplicado(ventaId, lote.id, unidadesAntesFinal, unidadesDespuesFinal);

      if (!marked) {
        return {
          ok: false,
          codigo: "INDETERMINADO",
          detalle: `El lote ${lote.id} se descontó pero no se pudo marcar APLICADO.`,
        };
      }

      return {
        ok: true,
        movimiento: {
          ventaId,
          loteId: lote.id,
          sucursalId,
          productoId,
          vencimiento: lote.vencimiento,
          cantidad,
          unidadesAntes: unidadesAntesFinal,
          unidadesDespues: unidadesDespuesFinal,
          estado: "APLICADO",
          actualizadoEn: new Date(),
        },
      };
    }

    await this.repository.transitionMovimiento(ventaId, lote.id, "PENDIENTE", "REVERTIDO");
    return { ok: false, codigo: "CONFLICTO", detalle: `CAS agotado para el lote ${lote.id}.` };
  }

  async compensar(ventaId: string): Promise<void> {
    const movimientos = await this.repository.findMovimientosByVenta(ventaId);

    if (movimientos.some((movimiento) => movimiento.estado === "PENDIENTE")) {
      throw new IndeterminadoError(`No se puede compensar ${ventaId}: existen movimientos PENDIENTE ambiguos.`);
    }

    const aplicados = movimientos.filter((movimiento) => movimiento.estado === "APLICADO").reverse();

    for (const movimiento of aplicados) {
      let restaurado = false;

      for (let intento = 1; intento <= MAX_INTENTOS_COMPENSACION; intento++) {
        const lote = await this.repository.findLote(
          movimiento.sucursalId,
          movimiento.productoId,
          movimiento.vencimiento,
          movimiento.loteId,
        );

        if (lote === null) {
          throw new IndeterminadoError(`No existe el lote ${movimiento.loteId} para compensar.`);
        }

        restaurado = await this.repository.incrementarLoteConCAS(
          movimiento.sucursalId,
          movimiento.productoId,
          movimiento.vencimiento,
          movimiento.loteId,
          movimiento.cantidad,
          lote.unidades,
        );

        if (restaurado) {
          break;
        }

        await sleep(backoff(intento));
      }

      if (!restaurado) {
        throw new IndeterminadoError(`No se pudo reponer el lote ${movimiento.loteId} tras varios intentos.`);
      }

      const marked = await this.repository.transitionMovimiento(ventaId, movimiento.loteId, "APLICADO", "REVERTIDO");

      if (!marked) {
        const actual = await this.repository.findMovimiento(ventaId, movimiento.loteId);

        if (actual?.estado !== "REVERTIDO") {
          throw new IndeterminadoError(`El lote ${movimiento.loteId} se repuso pero no se pudo marcar REVERTIDO.`);
        }
      }
    }
  }

  async resolverPendientes(movimientos: MovimientoStock[]): Promise<boolean> {
    for (const movimiento of movimientos.filter((item) => item.estado === "PENDIENTE")) {
      const lote = await this.repository.findLote(
        movimiento.sucursalId,
        movimiento.productoId,
        movimiento.vencimiento,
        movimiento.loteId,
      );

      if (lote === null) {
        return false;
      }

      if (
        movimiento.unidadesAntes !== undefined &&
        movimiento.unidadesDespues !== undefined &&
        lote.unidades === movimiento.unidadesAntes
      ) {
        const marked = await this.repository.transitionMovimiento(
          movimiento.ventaId,
          movimiento.loteId,
          "PENDIENTE",
          "REVERTIDO",
        );

        if (!marked) {
          return false;
        }

        continue;
      }

      if (
        movimiento.unidadesAntes !== undefined &&
        movimiento.unidadesDespues !== undefined &&
        lote.unidades === movimiento.unidadesDespues
      ) {
        const marked = await this.repository.marcarAplicado(
          movimiento.ventaId,
          movimiento.loteId,
          movimiento.unidadesAntes,
          movimiento.unidadesDespues,
        );

        if (!marked) {
          return false;
        }

        continue;
      }

      return false;
    }

    return true;
  }
}

export type CompensacionDependencies = {
  operaciones: OperacionVentaRepository;
  stockSaga: StockSaga;
};

/**
 * Compensa el stock de una operación PENDIENTE.
 * No cambia el estado de la operación: el llamador decide si marcar ABORTADA
 * o registrar el error para reconciliación.
 */
export async function compensarOperacion(
  operacionId: string,
  dependencies: CompensacionDependencies,
): Promise<{ ok: true } | { ok: false; detalle: string }> {
  const actual = await dependencies.operaciones.findOperacion(operacionId);

  if (actual === null) {
    return { ok: false, detalle: `No existe la operación ${operacionId}.` };
  }

  if (actual.estado === "ABORTADA" || actual.estado === "CONFIRMADA") {
    return { ok: true };
  }

  try {
    await dependencies.stockSaga.compensar(operacionId);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detalle: error instanceof Error ? error.message : String(error),
    };
  }
}

export type ResumenReconciliacion = {
  revisadas: number;
  confirmadas: number;
  compensadas: number;
  abortadas: number;
  indeterminadas: number;
  omitidas: number;
};

export type ReconciliarDependencies = {
  operaciones: OperacionVentaRepository;
  stockSaga: StockSaga;
  workerId: string;
};

export async function reconciliarOperaciones(
  dependencies: ReconciliarDependencies,
  options?: { olderThanMinutes?: number; limit?: number },
): Promise<ResumenReconciliacion> {
  const olderThanMinutes = options?.olderThanMinutes ?? 10;
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const operaciones = await dependencies.operaciones.findOperacionesParaReconciliar(cutoff, options?.limit ?? 100);

  const resumen: ResumenReconciliacion = {
    revisadas: 0,
    confirmadas: 0,
    compensadas: 0,
    abortadas: 0,
    indeterminadas: 0,
    omitidas: 0,
  };

  for (const operacion of operaciones) {
    resumen.revisadas++;

    const bloqueo = await dependencies.operaciones.adquirirBloqueo(operacion.id, dependencies.workerId);

    if (bloqueo === null) {
      resumen.omitidas++;
      continue;
    }

    try {
      const venta = await dependencies.operaciones.findVenta(operacion.id);
      let movimientos = await dependencies.stockSaga.findMovimientos(operacion.id);

      if (venta !== null) {
        if (movimientos.some((movimiento) => movimiento.estado === "PENDIENTE")) {
          const resueltos = await dependencies.stockSaga.resolverPendientes(movimientos);

          if (!resueltos) {
            await dependencies.operaciones.registrarError(
              operacion.id,
              "La venta existe pero hay movimientos PENDIENTE ambiguos.",
            );
            resumen.indeterminadas++;
            continue;
          }

          movimientos = await dependencies.stockSaga.findMovimientos(operacion.id);
        }

        if (movimientos.length > 0 && movimientos.every((movimiento) => movimiento.estado === "APLICADO")) {
          const confirmada = await dependencies.operaciones.marcarConfirmada(operacion.id, bloqueo);

          if (confirmada) {
            resumen.confirmadas++;
          } else {
            resumen.indeterminadas++;
          }

          continue;
        }

        await dependencies.operaciones.registrarError(
          operacion.id,
          "La venta existe pero los movimientos de stock no están todos APLICADO.",
        );
        resumen.indeterminadas++;
        continue;
      }

      if (movimientos.length === 0 || movimientos.every((movimiento) => movimiento.estado === "REVERTIDO")) {
        await dependencies.operaciones.marcarAbortada(operacion.id, "Sin venta ni stock aplicado.");
        resumen.abortadas++;
        continue;
      }

      if (movimientos.some((movimiento) => movimiento.estado === "PENDIENTE")) {
        const resueltos = await dependencies.stockSaga.resolverPendientes(movimientos);

        if (!resueltos) {
          await dependencies.operaciones.registrarError(operacion.id, "Hay movimientos PENDIENTE ambiguos sin venta.");
          resumen.indeterminadas++;
          continue;
        }

        movimientos = await dependencies.stockSaga.findMovimientos(operacion.id);
      }

      if (movimientos.some((movimiento) => movimiento.estado === "APLICADO")) {
        const compensacion = await compensarOperacion(operacion.id, dependencies);

        if (compensacion.ok) {
          await dependencies.operaciones.marcarAbortada(operacion.id, "Compensada por reconciliación.");
          resumen.compensadas++;
        } else {
          await dependencies.operaciones.registrarError(operacion.id, compensacion.detalle);
          resumen.indeterminadas++;
        }

        continue;
      }

      await dependencies.operaciones.marcarAbortada(operacion.id, "Operación sin venta.");
      resumen.abortadas++;
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      await dependencies.operaciones.registrarError(operacion.id, detalle);
      resumen.indeterminadas++;
    } finally {
      await dependencies.operaciones.liberarBloqueo(operacion.id, bloqueo);
    }
  }

  return resumen;
}
