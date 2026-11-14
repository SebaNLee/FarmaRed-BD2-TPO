import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { lotesBajoStock } from "../queries/q8-lotes-bajo-stock.js";

async function main(): Promise<void> {
  try {
    const [cassandra, mongo] = await Promise.all([connectCassandra(), connectMongo()]);
    const lotes = await lotesBajoStock(cassandra, mongo.db(mongoDatabaseName));
    console.log(JSON.stringify(lotes, null, 2));
  } finally {
    await Promise.allSettled([closeCassandra(), closeMongo()]);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q8: ${message}`);
  process.exitCode = 1;
});
