import type { Client } from "cassandra-driver";
import { env } from "../../config/env.js";
import { setupStockLotesTable } from "./tables/stock-lotes.js";
import { setupStockMovimientosTable } from "./tables/stock-movimientos.js";

export const cassandraKeyspace = env.CASSANDRA_KEYSPACE;

async function setupKeyspace(client: Client): Promise<void> {
  await client.execute(`
    CREATE KEYSPACE IF NOT EXISTS ${cassandraKeyspace}
    WITH replication = {
      'class': 'SimpleStrategy',
      'replication_factor': 1
    }
  `);
}

export async function setupCassandraDatabase(client: Client): Promise<void> {
  await setupKeyspace(client);
  await setupStockLotesTable(client, cassandraKeyspace);
  await setupStockMovimientosTable(client, cassandraKeyspace);
}
