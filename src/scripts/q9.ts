import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { ventasLibresMenoresA5000 } from "../queries/q9-ventas-libres-menores.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const ventas = await ventasLibresMenoresA5000(client.db(mongoDatabaseName));
    console.log(JSON.stringify(ventas, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q9: ${message}`);
  process.exitCode = 1;
});
