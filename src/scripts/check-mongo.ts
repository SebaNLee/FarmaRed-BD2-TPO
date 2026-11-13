import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { mongoCollectionNames } from "../db/mongo/setup.js";
import { MongoFarmaRedRepository } from "../repositories/mongo/farmared-repository.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    await db.command({ ping: 1 });

    const existingCollections = new Set(
      (await db.listCollections({}, { nameOnly: true }).toArray()).map((collection) => collection.name),
    );
    const missingCollections = mongoCollectionNames.filter((name) => !existingCollections.has(name));

    if (missingCollections.length > 0) {
      throw new Error(`Faltan colecciones: ${missingCollections.join(", ")}. Ejecutá "pnpm mongo:setup".`);
    }

    const repository = new MongoFarmaRedRepository(db);
    const counts = await repository.getDocumentCounts();

    console.log(`MongoDB disponible: base "${mongoDatabaseName}".`);
    for (const [collection, count] of Object.entries(counts)) {
      console.log(`${collection}: ${count}`);
    }
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error al verificar MongoDB: ${message}`);
  process.exitCode = 1;
});
