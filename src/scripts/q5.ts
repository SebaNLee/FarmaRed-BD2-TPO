import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { findFarmaceuticosActivosConVentasRecientes } from "../queries/q5-farmaceuticos-activos-con-ventas-recientes.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const farmaceuticos = await findFarmaceuticosActivosConVentasRecientes(db);

    console.log(`Query 5: ${farmaceuticos.length} farmacéuticos activos.`);
    console.dir(farmaceuticos, { depth: null });
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running query 5: ${message}`);
  process.exitCode = 1;
});
