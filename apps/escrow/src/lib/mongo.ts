import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "vku_escrow";

/**
 * Serverless functions are recycled constantly, so the connection promise is
 * parked on the global object and reused instead of opening a socket per call.
 */
const globalForMongo = globalThis as typeof globalThis & {
  _vkuMongo?: Promise<MongoClient>;
};

export function hasDatabase(): boolean {
  return Boolean(uri);
}

export async function database(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI chưa được cấu hình");
  globalForMongo._vkuMongo ??= new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
  }).connect();
  const client = await globalForMongo._vkuMongo;
  return client.db(dbName);
}
