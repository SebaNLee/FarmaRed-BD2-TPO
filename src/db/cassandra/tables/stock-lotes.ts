import type { Client } from "cassandra-driver";

export const stockLotesTable = "stock_lotes";

export async function setupStockLotesTable(client: Client, keyspace: string): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${keyspace}.${stockLotesTable} (
      sucursal_id text,
      producto_id text,
      vencimiento date,
      lote_id text,
      nro_lote text,
      unidades int,
      PRIMARY KEY ((sucursal_id, producto_id), vencimiento, lote_id)
    ) WITH CLUSTERING ORDER BY (vencimiento ASC, lote_id ASC)
  `);
}
