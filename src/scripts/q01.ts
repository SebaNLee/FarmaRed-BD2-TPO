import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { q01 } from "../queries/q01.js";
import { CassandraFarmaRedRepository } from "../repositories/cassandra/farmared-repository.js";

async function main(): Promise<void> {
  try {
    const client = await connectCassandra();
    const productos = await q01(new CassandraFarmaRedRepository(client));
    console.log(JSON.stringify(productos, null, 2));
  } finally {
    await closeCassandra();
  }
}

main().catch((error: unknown) => {
  console.error(`Error en q01: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
