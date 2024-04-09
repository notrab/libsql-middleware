import { createClient } from "libsql-stateless-easy";
import {
  beforeExecute,
  afterExecute,
  withLibsqlHooks,
} from "libsql-client-hooks";

const client = createClient({
  url: process.env.LIBSQL_URL!,
  authToken: process.env.LIBSQL_AUTH_TOKEN!,
});

const logBeforeQuery = beforeExecute(async (query) => {
  console.log("Before executing:", query);

  return query;
});

const logAfterQuery = afterExecute(async (result) => {
  console.log("After executing:", result);

  return result;
});

const enhancedClient = withLibsqlHooks(client, [logBeforeQuery, logAfterQuery]);

await enhancedClient.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await enhancedClient.execute("INSERT INTO users (name) VALUES ('Test User')");
await enhancedClient.execute("SELECT * FROM users");
