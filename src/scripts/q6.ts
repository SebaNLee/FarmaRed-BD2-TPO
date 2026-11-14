import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { recetasProlongadasConDispensaVencida } from "../queries/q6-recetas-dispensa-vencida.js";

async function main(): Promise<void> {
  try {
    const client = await connectMongo();
    const recetas = await recetasProlongadasConDispensaVencida(client.db(mongoDatabaseName));
    console.log(JSON.stringify(recetas, null, 2));
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q6: ${message}`);
  process.exitCode = 1;
});
