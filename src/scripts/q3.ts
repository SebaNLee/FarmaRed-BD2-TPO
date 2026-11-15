import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { findHistorialCliente } from "../queries/q3-historial-cliente.js";

function getClienteId(): string {
  const clienteId = process.argv.slice(2).find((argument) => argument !== "--");

  if (!clienteId) {
    throw new Error("Uso: pnpm q3 -- <clienteId>");
  }

  return clienteId;
}

async function main(): Promise<void> {
  const clienteId = getClienteId();

  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const historial = await findHistorialCliente(db, clienteId);

    console.log(`Query 3: ${historial.length} eventos para el cliente ${clienteId}.`);
    console.dir(historial, { depth: null });
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running query 3: ${message}`);
  process.exitCode = 1;
});
