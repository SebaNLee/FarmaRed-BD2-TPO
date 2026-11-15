import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { ingresosPorFarmaceuticoMesActual } from "../queries/q11-ingresos-por-farmaceutico.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const ingresos = await ingresosPorFarmaceuticoMesActual(client.db(mongoDatabaseName));
    console.log(JSON.stringify(ingresos, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q11: ${message}`);
  process.exitCode = 1;
});
