import type { Client, InStatement, ResultSet } from "@libsql/client";

export interface LibSQLPlugin {
  beforeExecute?: (
    query: InStatement,
    client: Client
  ) => Promise<InStatement> | InStatement;
  afterExecute?: (
    result: ResultSet,
    query: InStatement,
    client: Client
  ) => Promise<ResultSet> | ResultSet;
}

export function withLibsqlHooks(
  client: Client,
  plugins: LibSQLPlugin[]
): Client {
  const originalExecute = client.execute.bind(client);

  client.execute = async (stmt: InStatement): Promise<ResultSet> => {
    let modifiedStmt = stmt;

    for (const plugin of plugins) {
      if (plugin.beforeExecute) {
        modifiedStmt = await plugin.beforeExecute(modifiedStmt, client);
      }
    }

    const result = await originalExecute(modifiedStmt);

    let modifiedResult = result;

    for (const plugin of plugins) {
      if (plugin.afterExecute) {
        modifiedResult = await plugin.afterExecute(
          modifiedResult,
          modifiedStmt,
          client
        );
      }
    }

    return modifiedResult;
  };

  return client;
}

export function beforeExecute(
  handler: (
    query: InStatement,
    client: Client
  ) => Promise<InStatement> | InStatement
): LibSQLPlugin {
  return { beforeExecute: handler };
}

export function afterExecute(
  handler: (
    result: ResultSet,
    query: InStatement,
    client: Client
  ) => Promise<ResultSet> | ResultSet
): LibSQLPlugin {
  return { afterExecute: handler };
}
