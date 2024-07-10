import { createClient } from "@libsql/client";
import { withLibsqlHooks, LibSQLPlugin } from "libsql-client-hooks";
import * as Sentry from "@sentry/node";
import { getStatementType } from "sqlite-statement-type";

Sentry.init({
  dsn: "...",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const libsqlClient = createClient({ url: "file:dev.db" });

function createSentryPlugin(): LibSQLPlugin {
  let currentSpan: Sentry.Span | undefined;

  return {
    beforeExecute: (query) => {
      const sql = typeof query === "string" ? query : query.sql;
      const statementType = getStatementType(sql);

      return Sentry.startSpanManual(
        {
          op: `db.${statementType}`,
          name: sql,
        },
        (span) => {
          currentSpan = span;

          return query;
        }
      );
    },
    afterExecute: (result, query) => {
      const sql = typeof query === "string" ? query : query.sql;

      if (currentSpan) {
        if (result instanceof Error) {
          currentSpan.setStatus({ code: 2 });
          Sentry.captureException(result, {
            contexts: {
              libsql: {
                query: sql,
              },
            },
          });
        } else {
          currentSpan.setStatus({ code: 1 });
          if (result) {
            currentSpan.setAttribute("db.rows_affected", result.rowsAffected);
          }
        }

        currentSpan.end();
        currentSpan = undefined;
      }

      return result;
    },
  };
}

const sentryPlugin = createSentryPlugin();

const clientWithSentry = withLibsqlHooks(libsqlClient, [sentryPlugin]);

await clientWithSentry.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await clientWithSentry.execute("INSERT INTO users (name) VALUES ('Test User')");
await clientWithSentry.execute("SELECT * FROM users");
