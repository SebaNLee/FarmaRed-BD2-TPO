import { MongoClient } from "mongodb";

const mongoUri = "mongodb://127.0.0.1:27017";
export const mongoDatabaseName = "farmared";

export const mongoClient = new MongoClient(mongoUri);

export async function connectMongo(): Promise<MongoClient> {
  await mongoClient.connect();
  return mongoClient;
}

export async function closeMongo(): Promise<void> {
  await mongoClient.close();
}
