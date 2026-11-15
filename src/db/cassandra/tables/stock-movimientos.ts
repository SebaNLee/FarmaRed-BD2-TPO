import type { Client } from "cassandra-driver";

export const stockMovimientosTable = "stock_movimientos";

async function addColumnIfMissing(client: Client, keyspace: string, column: string, type: string): Promise<void> {
  try {
    await client.execute(`ALTER TABLE ${keyspace}.${stockMovimientosTable} ADD ${column} ${type}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Cassandra reports an invalid/conflicting column when it already exists.
    if (!/already exists|conflicts with an existing column/i.test(message)) {
      throw error;
    }
  }
}

export async function setupStockMovimientosTable(client: Client, keyspace: string): Promise<void> {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ${keyspace}.${stockMovimientosTable} (
      venta_id text,
      lote_id text,
      sucursal_id text,
      producto_id text,
      vencimiento date,
      cantidad int,
      unidades_antes int,
      unidades_despues int,
      estado text,
      actualizado_en timestamp,
      PRIMARY KEY ((venta_id), lote_id)
    )
  `);

  await addColumnIfMissing(client, keyspace, "unidades_antes", "int");
  await addColumnIfMissing(client, keyspace, "unidades_despues", "int");
}
