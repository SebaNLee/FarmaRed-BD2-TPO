import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { clientesSinVentasUltimoAnio } from "../queries/q12-clientes-sin-ventas.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const clientes = await clientesSinVentasUltimoAnio(client.db(mongoDatabaseName));
    console.log(JSON.stringify(clientes, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q12: ${message}`);
  process.exitCode = 1;
});
