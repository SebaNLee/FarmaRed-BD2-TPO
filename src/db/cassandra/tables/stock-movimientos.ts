import type { Client } from "cassandra-driver";

export const stockMovimientosTable = "stock_movimientos";

export async function setupStockMovimientosTable(client: Client, keyspace: string): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${keyspace}.${stockMovimientosTable} (
      venta_id text,
      lote_id text,
      sucursal_id text,
      producto_id text,
      vencimiento date,
      cantidad int,
      estado text,
      actualizado_en timestamp,
      PRIMARY KEY ((venta_id), lote_id)
    )
  `);
}
