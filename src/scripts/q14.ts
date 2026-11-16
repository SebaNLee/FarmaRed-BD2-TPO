import { z } from "zod";
import { closeCassandra, connectCassandra } from "../config/cassandra.js";
import { closeMongo, connectMongo, mongoDatabaseName } from "../config/mongo.js";
import { StockSaga } from "../queries/util/stock-saga.js";
import type { RegistrarVentaInput } from "../queries/util/types.js";
import { registrarVenta } from "../queries/q14-registrar-venta.js";
import { CassandraStockRepository } from "../repositories/cassandra/stock-repository.js";
import { CounterRepository } from "../repositories/mongo/counter-repository.js";
import { OperacionVentaRepository } from "../repositories/mongo/operacion-venta-repository.js";

const mediosPago = ["Efectivo", "Débito", "Crédito", "Transferencia", "Obra social"] as const;

const inputSchema = z.object({
  ventaId: z.string().min(1).optional(),
  clienteId: z.string().min(1),
  farmaceuticoId: z.string().min(1),
  recetaId: z.string().min(1).nullable().optional(),
  medioPago: z.enum(mediosPago),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        cantidad: z.number().int().positive(),
      }),
    )
    .min(1),
});

function parseInput(): RegistrarVentaInput {
  const rawInput = process.argv
    .slice(2)
    .filter((argument) => argument !== "--")
    .join(" ")
    .trim();

  if (!rawInput) {
    throw new Error(
      "Usage: pnpm q14 '<venta JSON>' (clienteId, farmaceuticoId, medioPago, items; recetaId y ventaId opcionales)",
    );
  }

  let json: unknown;

  try {
    json = JSON.parse(rawInput);
  } catch {
    throw new Error("The q14 input must be valid JSON.");
  }

  const parsed = inputSchema.safeParse(json);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`);
    throw new Error(`Invalid q14 input:\n- ${issues.join("\n- ")}`);
  }

  return parsed.data;
}

async function main(): Promise<void> {
  const input = parseInput();
  const mongoClient = await connectMongo();

  try {
    const cassandraClient = await connectCassandra();

    try {
      const db = mongoClient.db(mongoDatabaseName);
      const result = await registrarVenta(input, {
        operaciones: new OperacionVentaRepository(mongoClient, db),
        stockSaga: new StockSaga(new CassandraStockRepository(cassandraClient)),
        counters: new CounterRepository(db),
        workerId: `q14-cli-${process.pid}-${Date.now()}`,
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
  console.error(`Error running q14: ${message}`);
  process.exitCode = 1;
});
