import { Client } from "cassandra-driver";
import { env, parseCassandraEndpoints } from "./env.js";

const cassandraEndpoint = parseCassandraEndpoints(env.CASSANDRA_CONTACT_POINTS);

export const cassandraClient = new Client({
  contactPoints: cassandraEndpoint.contactPoints,
  localDataCenter: env.CASSANDRA_LOCAL_DATACENTER,
  protocolOptions: {
    port: cassandraEndpoint.port,
  },
});

export async function connectCassandra(): Promise<Client> {
  await cassandraClient.connect();
  return cassandraClient;
}

export async function closeCassandra(): Promise<void> {
  await cassandraClient.shutdown();
}
