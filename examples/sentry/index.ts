import { createClient } from "@libsql/client";
import { withLibsqlHooks, beforeExecute } from "libsql-client-hooks";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const libsqlClient = createClient({ url: "file:dev.db" });

const startSpan = beforeExecute((query) =>
  Sentry.startSpan(
    {
      op: "query",
      name: "Database Query Execution",
      attributes: {},
    },
    () => {
      return query;
    }
  )
);

const enhancedClient = withLibsqlHooks(libsqlClient, [startSpan]);

await enhancedClient.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await enhancedClient.execute("INSERT INTO users (name) VALUES ('Test User')");
await enhancedClient.execute("SELECT * FROM users");
