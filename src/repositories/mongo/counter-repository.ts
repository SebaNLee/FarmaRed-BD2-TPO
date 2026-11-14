import type { Collection, Db } from "mongodb";
import type { FarmaRedData } from "../../etl/load-data.js";

/**
 * Counters for entities created at runtime.
 */
export const counterDefinitions = {
  clientes: { prefix: "C", width: 3, dataKey: "clientes" },
  ventas: { prefix: "V", width: 3, dataKey: "ventas" },
  detalles: { prefix: "D", width: 3, dataKey: "detallesVenta" },
} as const satisfies Record<string, { prefix: string; width: number; dataKey: keyof FarmaRedData }>;

export type CounterName = keyof typeof counterDefinitions;

type CounterDocument = {
  _id: CounterName;
  seq: number;
};

function maxSequence(prefix: string, ids: string[]): number | null {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max: number | null = null;

  for (const id of ids) {
    const match = pattern.exec(id);

    if (!match) {
      continue;
    }

    const value = Number(match[1]);

    if (!Number.isSafeInteger(value)) {
      continue;
    }

    max = max === null ? value : Math.max(max, value);
  }

  return max;
}

export class CounterRepository {
  private readonly counters: Collection<CounterDocument>;

  constructor(db: Db) {
    this.counters = db.collection<CounterDocument>("counters");
  }

  /**
   * Atomically reserves the next ID for an entity. Fails when the counter was never seeded instead of starting from 1.
   */
  async nextId(name: CounterName): Promise<string> {
    const document = await this.counters.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { upsert: false, returnDocument: "after" },
    );

    if (!document) {
      throw new Error(`Counter "${name}" is not initialized. Run "pnpm mongo:load".`);
    }

    const { prefix, width } = counterDefinitions[name];
    return `${prefix}${String(document.seq).padStart(width, "0")}`;
  }

  /**
   * Seeds every counter with the highest ID found in the already loaded data. Returns the resulting value of each counter.
   */
  async syncFrom(data: FarmaRedData): Promise<Partial<Record<CounterName, number>>> {
    const names = Object.keys(counterDefinitions) as CounterName[];
    const sequences: Partial<Record<CounterName, number>> = {};

    for (const name of names) {
      const definition = counterDefinitions[name];
      const items = data[definition.dataKey] as Array<{ id: string }>;
      const max = maxSequence(
        definition.prefix,
        items.map((item) => item.id),
      );

      if (max === null) {
        continue;
      }

      const document = await this.counters.findOneAndUpdate(
        { _id: name },
        { $max: { seq: max } },
        { upsert: true, returnDocument: "after" },
      );

      sequences[name] = document?.seq ?? max;
    }

    return sequences;
  }
}
