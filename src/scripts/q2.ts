import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { findVentasPendientesConFarmaceutico } from "../queries/q2-ventas-pendientes-con-farmaceutico.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const ventas = await findVentasPendientesConFarmaceutico(db);

    console.log(`Query 2: ${ventas.length} ventas pendientes.`);
    console.dir(ventas, { depth: null });
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running query 2: ${message}`);
  process.exitCode = 1;
});
