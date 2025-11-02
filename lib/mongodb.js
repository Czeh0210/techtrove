import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is not set in environment variables");
}

let cachedClient = global._mongoClient;

export async function getMongoClient() {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, { 
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  global._mongoClient = client;
  return client;
}

export async function getDb() {
  const client = await getMongoClient();
  // Uses database from connection string (e.g., /myDatabase)
  return client.db();
}


