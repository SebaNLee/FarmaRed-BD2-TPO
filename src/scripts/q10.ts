import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { clientesPorSucursal } from "../queries/q10-clientes-por-sucursal.js";

async function main(): Promise<void> {
  const sucursalId = process.argv[2]?.trim();

  if (!sucursalId) {
    throw new Error("Usage: pnpm q10 <sucursalId>");
  }

  try {
    const client = await connectMongo();
    const clientes = await clientesPorSucursal(client.db(mongoDatabaseName), sucursalId);
    console.log(JSON.stringify(clientes, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q10: ${message}`);
  process.exitCode = 1;
});
