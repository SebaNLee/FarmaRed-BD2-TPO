import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { setupMongoDatabase } from "../db/mongo/setup.js";
import { assembleVentasConDetalles } from "../etl/assemblers/assemble-ventas-con-detalles.js";
import { loadFarmaRedData } from "../etl/load-data.js";
import { validateData } from "../etl/validators/index.js";
import { CounterRepository } from "../repositories/mongo/counter-repository.js";
import { MongoFarmaRedRepository } from "../repositories/mongo/farmared-repository.js";

async function main(): Promise<void> {
  const data = await loadFarmaRedData();
  validateData(data);
  const ventasConDetalles = assembleVentasConDetalles(data.ventas, data.detallesVenta);

  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    await setupMongoDatabase(db);

    const repository = new MongoFarmaRedRepository(db);
    await repository.upsertData(data, ventasConDetalles);

    const counters = new CounterRepository(db);
    const sequences = await counters.syncFrom(data);

    const counts = await repository.getDocumentCounts();
    console.log("MongoDB load completed.");
    for (const [collection, count] of Object.entries(counts)) {
      console.log(`${collection}: ${count}`);
    }

    const summary = Object.entries(sequences)
      .map(([name, seq]) => `${name}=${seq}`)
      .join(", ");
    console.log(`counters: ${summary || "none"}`);
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error loading MongoDB: ${message}`);
  process.exitCode = 1;
});
