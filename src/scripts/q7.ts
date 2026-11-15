import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { topProductosMasVendidos } from "../queries/q7-top-productos-vendidos.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const productos = await topProductosMasVendidos(client.db(mongoDatabaseName));
    console.log(JSON.stringify(productos, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q7: ${message}`);
  process.exitCode = 1;
});
