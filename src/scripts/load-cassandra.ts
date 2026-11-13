import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { setupCassandraDatabase } from "../db/cassandra/setup.js";
import { loadFarmaRedData } from "../etl/load-data.js";
import { validateData } from "../etl/validators/index.js";
import { CassandraStockRepository } from "../repositories/cassandra/stock-repository.js";

async function main(): Promise<void> {
  const data = await loadFarmaRedData();
  validateData(data);

  const shouldReset = process.argv.includes("--reset");

  try {
    const client = await connectCassandra();
    await setupCassandraDatabase(client);

    const repository = new CassandraStockRepository(client);

    if (shouldReset) {
      await repository.truncate();
      console.log("Stock tables truncated.");
    }

    await repository.upsertLotes(data.lotesStock);

    const count = await repository.countLotes();
    console.log("Cassandra load completed.");
    console.log(`stock_lotes: ${count}`);
  } finally {
    await closeCassandra();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error loading Cassandra: ${message}`);
  process.exitCode = 1;
});
