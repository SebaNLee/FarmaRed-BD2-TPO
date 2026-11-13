import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { cassandraKeyspace } from "../db/cassandra/setup.js";
import { CassandraStockRepository } from "../repositories/cassandra/stock-repository.js";
import { fromDateOnlyString, today } from "../utils/date.js";

async function main(): Promise<void> {
  try {
    const client = await connectCassandra();
    const repository = new CassandraStockRepository(client);

    const count = await repository.countLotes();
    const lotes = await repository.findAllLotes();

    console.log(`Cassandra available: stock in keyspace ${cassandraKeyspace}.`);
    console.log(`stock_lotes: ${count}`);

    const muestra = [...lotes].sort((a, b) => a.vencimiento.getTime() - b.vencimiento.getTime()).slice(0, 5);

    for (const lote of muestra) {
      console.log(
        `${lote.id} | ${lote.productoId} | ${lote.sucursalId} | ${lote.unidades} units | expires ${lote.vencimiento
          .toISOString()
          .slice(0, 10)}`,
      );
    }

    const grupos = new Map<string, typeof lotes>();
    const hoy = fromDateOnlyString(today());

    for (const lote of lotes) {
      if (lote.vencimiento < hoy) {
        continue;
      }

      const clave = `${lote.sucursalId}|${lote.productoId}`;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(lote);
      grupos.set(clave, grupo);
    }

    const [claveReferencia, grupoReferencia] = [...grupos.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];

    if (claveReferencia && grupoReferencia) {
      const [sucursalId, productoId] = claveReferencia.split("|");
      const fefo = await repository.findLotesFEFO(sucursalId, productoId);
      const secuencia = fefo.map((lote) => `${lote.id} (${lote.vencimiento.toISOString().slice(0, 10)})`).join(" -> ");

      console.log(`FEFO ${productoId} at ${sucursalId}: ${secuencia}`);
    }
  } finally {
    await closeCassandra();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error checking Cassandra: ${message}`);
  process.exitCode = 1;
});
