import { Client } from "cassandra-driver";

export const cassandraClient = new Client({
  contactPoints: ["127.0.0.1"],
  localDataCenter: "datacenter1",
});

export async function connectCassandra(): Promise<Client> {
  await cassandraClient.connect();
  return cassandraClient;
}

export async function closeCassandra(): Promise<void> {
  await cassandraClient.shutdown();
}
