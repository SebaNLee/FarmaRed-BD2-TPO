import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { setupMongoDatabase } from "../db/mongo/setup.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);

    await setupMongoDatabase(db);
    console.log(`MongoDB ready: database "${mongoDatabaseName}" and collections created.`);
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error setting up MongoDB: ${message}`);
  process.exitCode = 1;
});
