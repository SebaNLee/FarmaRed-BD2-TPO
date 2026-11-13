import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { setupMongoDatabase } from "../db/mongo/setup.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);

    await setupMongoDatabase(db);
    console.log(`MongoDB preparado: base "${mongoDatabaseName}" y colecciones creadas.`);
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error al preparar MongoDB: ${message}`);
  process.exitCode = 1;
});
