import type { Client } from "cassandra-driver";
import { setupProductosActivosByBucketTable } from "./tables/productos-activos-by-bucket.js";

export const cassandraKeyspace = "farmared";

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
  await setupProductosActivosByBucketTable(client, cassandraKeyspace);
}
