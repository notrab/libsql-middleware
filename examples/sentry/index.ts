import { createClient, LibsqlError } from "@libsql/client";
import { withMiddleware, executeInterceptor } from "libsql-middleware";
import * as Sentry from "@sentry/node";
import { getStatementType } from "sqlite-statement-type";

Sentry.init({
  dsn: "...",
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const libsqlClient = createClient({ url: "file:dev.db" });

const sentryPlugin = executeInterceptor(async (next, query) => {
  const sql = typeof query === "string" ? query : query.sql;
  const statementType = getStatementType(sql);

  return Sentry.startSpan(
    {
      op: `db.${statementType}`,
      name: sql,
      attributes: {
        "db.system": "libsql",
        "db.operation": `${statementType}`,
      },
    },
    async (span) => {
      try {
        const result = await next(query);

        if (span) {
          span.setStatus({ code: 1 });
          if (result) {
            span.setAttribute("db.rows_affected", result.rowsAffected);
            span.setAttribute(
              "db.last_insert_rowid",
              result.lastInsertRowid?.toString()
            );
          }
        }

        return result;
      } catch (error: unknown) {
        if (span) {
          span.setStatus({ code: 2 });
        }

        if (error instanceof LibsqlError) {
          Sentry.captureException(error);
        } else if (error instanceof Error) {
          Sentry.captureException(error, {
            contexts: {
              libsql: {
                query: sql,
              },
            },
          });
        } else {
          Sentry.captureMessage("Unknown error in LibSQL query", {
            level: "error",
            contexts: {
              libsql: {
                query: sql,
              },
            },
          });
        }

        throw error;
      }
    }
  );
});

const clientWithSentry = withMiddleware(libsqlClient, [sentryPlugin]);

await clientWithSentry.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await clientWithSentry.execute("INSERT INTO users (name) VALUES ('Test User')");
await clientWithSentry.execute("SELECT * FROM users");
