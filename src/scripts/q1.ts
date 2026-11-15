import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { findProductosActivosConProveedor } from "../queries/q1-productos-activos-con-proveedor.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const productos = await findProductosActivosConProveedor(db);

    console.log(`Query 1: ${productos.length} productos activos con proveedor.`);
    console.dir(productos, { depth: null });
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running query 1: ${message}`);
  process.exitCode = 1;
});
