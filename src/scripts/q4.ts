import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { findClientesConMasDeUnaReceta } from "../queries/q4-clientes-con-mas-de-una-receta.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const clientes = await findClientesConMasDeUnaReceta(db);

    console.log(`Query 4: ${clientes.length} clientes con más de una receta.`);
    console.dir(clientes, { depth: null });
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running query 4: ${message}`);
  process.exitCode = 1;
});
