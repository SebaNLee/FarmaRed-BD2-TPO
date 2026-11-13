import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { altaCliente, bajaCliente, modificarCliente } from "../queries/q13-abm-clientes.js";

async function main(): Promise<void> {
  const [operacion, argumento, cambiosJson] = process.argv.slice(2);
  if (
    !argumento?.trim() ||
    !["alta", "modificar", "baja"].includes(operacion) ||
    (operacion === "modificar" && !cambiosJson?.trim())
  ) {
    throw new Error("Uso: pnpm q13 alta '<datos JSON>' | modificar <clienteId> '<cambios JSON>' | baja <clienteId>");
  }
  const datos =
    operacion === "alta" ? JSON.parse(argumento) : operacion === "modificar" ? JSON.parse(cambiosJson) : undefined;

  try {
    const client = await connectMongo();
    const db = client.db(mongoDatabaseName);
    const cliente =
      operacion === "alta"
        ? await altaCliente(db, datos)
        : operacion === "modificar"
          ? await modificarCliente(db, argumento, datos)
          : await bajaCliente(db, argumento);
    console.log(JSON.stringify(cliente, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q13: ${message}`);
  process.exitCode = 1;
});
