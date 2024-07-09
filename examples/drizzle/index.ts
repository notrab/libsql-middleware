import { createClient } from "@libsql/client";
import {
  withLibsqlHooks,
  afterExecute,
  beforeExecute,
} from "libsql-client-hooks";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";
import { sql, SQL } from "drizzle-orm";

const client = createClient({ url: "file:dev.db" });

const logBeforeQuery = beforeExecute(async (query) => {
  console.log("Before executing:", query);
  return query;
});

const logAfterQuery = afterExecute(async (result) => {
  console.log("After executing:", result);
  return result;
});

const enhancedClient = withLibsqlHooks(client, [logBeforeQuery, logAfterQuery]);

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
