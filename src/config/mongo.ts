import { MongoClient } from "mongodb";
import { env } from "./env.js";

export const mongoDatabaseName = env.MONGO_DB;

export const mongoClient = new MongoClient(env.MONGO_URI);

export async function connectMongo(): Promise<MongoClient> {
  await mongoClient.connect();
  return mongoClient;
}

export async function closeMongo(): Promise<void> {
  await mongoClient.close();
}
