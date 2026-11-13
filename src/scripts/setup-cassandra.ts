import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { cassandraKeyspace, setupCassandraDatabase } from "../db/cassandra/setup.js";

async function main(): Promise<void> {
  try {
    const client = await connectCassandra();
    await setupCassandraDatabase(client);
    console.log(`Cassandra ready: keyspace "${cassandraKeyspace}" and stock tables created.`);
  } finally {
    await closeCassandra();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error setting up Cassandra: ${message}`);
  process.exitCode = 1;
});
