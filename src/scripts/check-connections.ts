import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";

async function checkMongo(): Promise<void> {
  try {
    const client = await connectMongo();
    await client.db("admin").command({ ping: 1 });
    console.log(`MongoDB connected (database: ${mongoDatabaseName}).`);
  } finally {
    await closeMongo();
  }
}

async function checkCassandra(): Promise<void> {
  try {
    const client = await connectCassandra();
    await client.execute("SELECT release_version FROM system.local");
    console.log("Cassandra connected.");
  } finally {
    await closeCassandra();
  }
}

async function main(): Promise<void> {
  const results = await Promise.allSettled([checkMongo(), checkCassandra()]);
  const failedChecks = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");

  if (failedChecks.length === 0) {
    console.log("All services are up and accepting connections.");
    return;
  }

  for (const result of failedChecks) {
    const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
    console.error(`Connection error: ${message}`);
  }

  process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Unexpected error: ${message}`);
  process.exitCode = 1;
});
