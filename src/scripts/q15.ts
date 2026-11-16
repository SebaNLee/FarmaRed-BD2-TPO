import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { StockSaga } from "../queries/util/stock-saga.js";
import { actualizarStockVenta } from "../queries/q15-actualizar-stock.js";
import { CassandraStockRepository } from "../repositories/cassandra/stock-repository.js";
import { OperacionVentaRepository } from "../repositories/mongo/operacion-venta-repository.js";

function getVentaId(): string {
  const ventaId = process.argv
    .slice(2)
    .find((argument) => argument !== "--")
    ?.trim();

  if (!ventaId) {
    throw new Error("Usage: pnpm q15 <ventaId>");
  }

  return ventaId;
}

async function main(): Promise<void> {
  const ventaId = getVentaId();
  const mongoClient = await connectMongo();

  try {
    const cassandraClient = await connectCassandra();

    try {
      const db = mongoClient.db(mongoDatabaseName);
      const result = await actualizarStockVenta(ventaId, {
        operaciones: new OperacionVentaRepository(mongoClient, db),
        stockSaga: new StockSaga(new CassandraStockRepository(cassandraClient)),
        workerId: `q15-cli-${process.pid}-${Date.now()}`,
      });

      console.log(JSON.stringify(result, null, 2));

      if (!result.ok) {
        process.exitCode = 1;
      }
    } finally {
      await closeCassandra();
    }
  } finally {
    await closeMongo();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error running q15: ${message}`);
  process.exitCode = 1;
});
