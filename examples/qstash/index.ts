import { Client } from "@upstash/qstash";
import { createClient } from "@libsql/client";
import { type LibSQLPlugin, withLibsqlHooks } from "libsql-client-hooks";

const libsqlClient = createClient({ url: "file:dev.db" });

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

const createChildDatabase: LibSQLPlugin = {
  afterExecute: async (result, query) => {
    console.log("After executing");

    // Check if `query` is `INSERT INTO users`

    await qstash.publishJSON({
      url: process.env.TARGET_URL!,
      body: {
        query,
        result,
      },
    });

    return result;
  },
};

const enhancedClient = withLibsqlHooks(libsqlClient, [createChildDatabase]);

await enhancedClient.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await enhancedClient.execute("INSERT INTO users (name) VALUES ('Test User')");
await enhancedClient.execute("SELECT * FROM users");
