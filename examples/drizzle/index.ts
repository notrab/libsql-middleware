import { createClient } from "@libsql/client";
import { withMiddleware, afterExecute, beforeExecute } from "libsql-middleware";
import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";

import * as schema from "./schema";

const client = createClient({ url: "file:dev.db" });

const logBeforeQuery = beforeExecute(async (query) => {
  console.log("Before executing:", query);
  return query;
});

const logAfterQuery = afterExecute(async (result, query) => {
  console.log("After executing:", result);
  console.log("After executing query:", query);
  return result;
});

const enhancedClient = withMiddleware(client, [logBeforeQuery, logAfterQuery]);

const db = drizzle(enhancedClient, {
  schema,
});

await db.run(
  sql`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`
);

const insertedUser = await db
  .insert(schema.users)
  .values({ name: "Test User" })
  .returning();

console.log({ insertedUser });

const users = await db.query.users.findMany();

console.log({ users });
