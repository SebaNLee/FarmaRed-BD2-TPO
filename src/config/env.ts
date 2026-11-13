import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  MONGO_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/?replicaSet=rs0"),
  MONGO_DB: z.string().min(1).default("farmared"),
  CASSANDRA_CONTACT_POINTS: z.string().min(1).default("127.0.0.1:9042"),
  CASSANDRA_LOCAL_DATACENTER: z.string().min(1).default("datacenter1"),
  CASSANDRA_KEYSPACE: z.string().min(1).default("farmared"),
  TZ: z.string().min(1).default("America/Argentina/Buenos_Aires"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n- ");
  throw new Error(`Configuración de entorno inválida:\n- ${issues}`);
}

export const env = parsedEnv.data;

export type CassandraEndpoint = {
  contactPoints: string[];
  port: number;
};

export function parseCassandraEndpoints(rawContactPoints: string): CassandraEndpoint {
  const entries = rawContactPoints
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    throw new Error("CASSANDRA_CONTACT_POINTS no puede estar vacío.");
  }

  const parsedEntries = entries.map((entry) => {
    const [host, rawPort] = entry.split(":");
    const port = rawPort === undefined ? 9042 : Number(rawPort);

    if (!host || !Number.isInteger(port) || port <= 0) {
      throw new Error(`Contact point inválido: "${entry}". Formato esperado: host:puerto.`);
    }

    return { host, port };
  });

  const port = parsedEntries[0].port;
  const inconsistentPort = parsedEntries.find((entry) => entry.port !== port);

  if (inconsistentPort) {
    throw new Error("Todos los contact points deben usar el mismo puerto.");
  }

  return {
    contactPoints: parsedEntries.map((entry) => entry.host),
    port,
  };
}
