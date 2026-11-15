import { types, type Client } from "cassandra-driver";
import { env } from "../../config/env.js";
import { stockLotesTable } from "../../db/cassandra/tables/stock-lotes.js";
import { stockMovimientosTable } from "../../db/cassandra/tables/stock-movimientos.js";
import type { LoteStock } from "../../models/lote.stock.js";
import type { MovimientoStock } from "../../models/stock-movimiento.js";
import type { StockLoteRow } from "../../schemas/cassandra/stock-lote.js";
import type { StockMovimientoRow } from "../../schemas/cassandra/stock-movimiento.js";
import { today } from "../../utils/date.js";
import { fromStockLoteRow, toStockLoteRow } from "./mappers/stock-lote.js";
import { fromStockMovimientoRow, toLocalDate } from "./mappers/stock-movimiento.js";

const readConsistency = types.consistencies.localQuorum;
const writeConsistency = types.consistencies.localQuorum;
const serialConsistency = types.consistencies.localSerial;

function toNumber(value: unknown): number {
  if (value === undefined || value === null) {
    return 0;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }

  return Number(value);
}

export class CassandraStockRepository {
  constructor(private readonly client: Client) {}

  private table(name: string): string {
    return `${env.CASSANDRA_KEYSPACE}.${name}`;
  }

  async upsertLotes(lotes: LoteStock[]): Promise<void> {
    for (const lote of lotes) {
      const row = toStockLoteRow(lote);

      await this.client.execute(
        `INSERT INTO ${this.table(stockLotesTable)}
          (sucursal_id, producto_id, vencimiento, lote_id, nro_lote, unidades)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [row.sucursal_id, row.producto_id, row.vencimiento, row.lote_id, row.nro_lote, row.unidades],
        { prepare: true, consistency: writeConsistency },
      );
    }
  }

  async findLotesFEFO(sucursalId: string, productoId: string, desde = today()): Promise<LoteStock[]> {
    const result = await this.client.execute(
      `SELECT sucursal_id, producto_id, vencimiento, lote_id, nro_lote, unidades
       FROM ${this.table(stockLotesTable)}
       WHERE sucursal_id = ? AND producto_id = ? AND vencimiento >= ?`,
      [sucursalId, productoId, types.LocalDate.fromString(desde)],
      { prepare: true, consistency: readConsistency },
    );

    return result.rows.map((row) => fromStockLoteRow(row as unknown as StockLoteRow));
  }

  async findLote(sucursalId: string, productoId: string, vencimiento: Date, loteId: string): Promise<LoteStock | null> {
    const result = await this.client.execute(
      `SELECT sucursal_id, producto_id, vencimiento, lote_id, nro_lote, unidades
       FROM ${this.table(stockLotesTable)}
       WHERE sucursal_id = ? AND producto_id = ? AND vencimiento = ? AND lote_id = ?`,
      [sucursalId, productoId, toLocalDate(vencimiento), loteId],
      { prepare: true, consistency: readConsistency },
    );

    const row = result.rows[0] as unknown as StockLoteRow | undefined;
    return row === undefined ? null : fromStockLoteRow(row);
  }

  async findAllLotes(): Promise<LoteStock[]> {
    const result = await this.client.execute(
      `SELECT sucursal_id, producto_id, vencimiento, lote_id, nro_lote, unidades
       FROM ${this.table(stockLotesTable)}`,
      [],
      { prepare: true, consistency: readConsistency },
    );

    return result.rows.map((row) => fromStockLoteRow(row as unknown as StockLoteRow));
  }

  async countLotes(): Promise<number> {
    const result = await this.client.execute(`SELECT COUNT(*) AS total FROM ${this.table(stockLotesTable)}`, [], {
      prepare: true,
      consistency: readConsistency,
    });

    return toNumber((result.rows[0] as { total?: unknown } | undefined)?.total);
  }

  async findMovimientosByVenta(ventaId: string): Promise<MovimientoStock[]> {
    const result = await this.client.execute(
      `SELECT venta_id, lote_id, sucursal_id, producto_id, vencimiento,
              cantidad, unidades_antes, unidades_despues, estado, actualizado_en
       FROM ${this.table(stockMovimientosTable)}
       WHERE venta_id = ?`,
      [ventaId],
      { prepare: true, consistency: readConsistency },
    );

    return result.rows.map((row) => fromStockMovimientoRow(row as unknown as StockMovimientoRow));
  }

  async findMovimiento(ventaId: string, loteId: string): Promise<MovimientoStock | null> {
    const result = await this.client.execute(
      `SELECT venta_id, lote_id, sucursal_id, producto_id, vencimiento,
              cantidad, unidades_antes, unidades_despues, estado, actualizado_en
       FROM ${this.table(stockMovimientosTable)}
       WHERE venta_id = ? AND lote_id = ?`,
      [ventaId, loteId],
      { prepare: true, consistency: readConsistency },
    );

    const row = result.rows[0] as unknown as StockMovimientoRow | undefined;
    return row === undefined ? null : fromStockMovimientoRow(row);
  }

  async findAllMovimientos(): Promise<MovimientoStock[]> {
    const result = await this.client.execute(
      `SELECT venta_id, lote_id, sucursal_id, producto_id, vencimiento,
              cantidad, unidades_antes, unidades_despues, estado, actualizado_en
       FROM ${this.table(stockMovimientosTable)}`,
      [],
      { prepare: true, consistency: readConsistency },
    );

    return result.rows.map((row) => fromStockMovimientoRow(row as unknown as StockMovimientoRow));
  }

  async findMovimientosPendientes(olderThan = new Date()): Promise<MovimientoStock[]> {
    const movimientos = await this.findAllMovimientos();

    return movimientos.filter(
      (movimiento) => movimiento.estado === "PENDIENTE" && movimiento.actualizadoEn < olderThan,
    );
  }

  async truncate(): Promise<void> {
    await this.client.execute(`TRUNCATE ${this.table(stockMovimientosTable)}`);
    await this.client.execute(`TRUNCATE ${this.table(stockLotesTable)}`);
  }

  async claimMovimiento(movimiento: Omit<MovimientoStock, "estado">): Promise<boolean> {
    const result = await this.client.execute(
      `INSERT INTO ${this.table(stockMovimientosTable)}
        (venta_id, lote_id, sucursal_id, producto_id, vencimiento, cantidad,
         unidades_antes, unidades_despues, estado, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       IF NOT EXISTS`,
      [
        movimiento.ventaId,
        movimiento.loteId,
        movimiento.sucursalId,
        movimiento.productoId,
        toLocalDate(movimiento.vencimiento),
        movimiento.cantidad,
        movimiento.unidadesAntes ?? null,
        movimiento.unidadesDespues ?? null,
        "PENDIENTE",
        movimiento.actualizadoEn,
      ],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }

  async marcarAplicado(
    ventaId: string,
    loteId: string,
    unidadesAntes: number,
    unidadesDespues: number,
    actualizadoEn = new Date(),
  ): Promise<boolean> {
    const result = await this.client.execute(
      `UPDATE ${this.table(stockMovimientosTable)}
       SET estado = ?, unidades_antes = ?, unidades_despues = ?, actualizado_en = ?
       WHERE venta_id = ? AND lote_id = ?
       IF estado = ?`,
      ["APLICADO", unidadesAntes, unidadesDespues, actualizadoEn, ventaId, loteId, "PENDIENTE"],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }

  async actualizarIntentoMovimiento(
    ventaId: string,
    loteId: string,
    unidadesAntes: number,
    unidadesDespues: number,
    actualizadoEn = new Date(),
  ): Promise<boolean> {
    const result = await this.client.execute(
      `UPDATE ${this.table(stockMovimientosTable)}
       SET unidades_antes = ?, unidades_despues = ?, actualizado_en = ?
       WHERE venta_id = ? AND lote_id = ?
       IF estado = ?`,
      [unidadesAntes, unidadesDespues, actualizadoEn, ventaId, loteId, "PENDIENTE"],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }

  async decrementarLote(
    sucursalId: string,
    productoId: string,
    vencimiento: Date,
    loteId: string,
    cantidad: number,
    unidadesActuales: number,
  ): Promise<boolean> {
    if (unidadesActuales < cantidad) {
      return false;
    }

    const result = await this.client.execute(
      `UPDATE ${this.table(stockLotesTable)}
       SET unidades = ?
       WHERE sucursal_id = ? AND producto_id = ? AND vencimiento = ? AND lote_id = ?
       IF unidades = ?`,
      [unidadesActuales - cantidad, sucursalId, productoId, toLocalDate(vencimiento), loteId, unidadesActuales],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }

  async incrementarLoteConCAS(
    sucursalId: string,
    productoId: string,
    vencimiento: Date,
    loteId: string,
    cantidad: number,
    unidadesActuales: number,
  ): Promise<boolean> {
    const result = await this.client.execute(
      `UPDATE ${this.table(stockLotesTable)}
       SET unidades = ?
       WHERE sucursal_id = ? AND producto_id = ? AND vencimiento = ? AND lote_id = ?
       IF unidades = ?`,
      [unidadesActuales + cantidad, sucursalId, productoId, toLocalDate(vencimiento), loteId, unidadesActuales],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }

  async transitionMovimiento(
    ventaId: string,
    loteId: string,
    fromEstado: MovimientoStock["estado"],
    toEstado: MovimientoStock["estado"],
    actualizadoEn = new Date(),
  ): Promise<boolean> {
    const result = await this.client.execute(
      `UPDATE ${this.table(stockMovimientosTable)}
       SET estado = ?, actualizado_en = ?
       WHERE venta_id = ? AND lote_id = ?
       IF estado = ?`,
      [toEstado, actualizadoEn, ventaId, loteId, fromEstado],
      { prepare: true, consistency: writeConsistency, serialConsistency },
    );

    return result.wasApplied();
  }
}
