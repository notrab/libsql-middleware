import type { Client, InStatement, ResultSet } from "@libsql/core/api";

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
  beforeBatch?: (
    stmts: InStatement[],
    client: Client
  ) => Promise<InStatement[]> | InStatement[];
  afterBatch?: (
    results: ResultSet[],
    stmts: InStatement[],
    client: Client
  ) => Promise<ResultSet[]> | ResultSet[];
}

export function withLibsqlHooks(
  client: Client,
  plugins: LibSQLPlugin[]
): Client {
  const originalExecute = client.execute.bind(client);
  const originalBatch = client.batch.bind(client);

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

  client.batch = async (stmts: InStatement[]): Promise<ResultSet[]> => {
    let modifiedStmts = stmts;

    for (const plugin of plugins) {
      if (plugin.beforeBatch) {
        modifiedStmts = await plugin.beforeBatch(modifiedStmts, client);
      }
    }

    const results = await originalBatch(modifiedStmts);

    for (const plugin of plugins) {
      if (plugin.afterBatch) {
        await plugin.afterBatch(results, modifiedStmts, client);
      }
    }

    return results;
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

export function beforeBatch(
  handler: (
    stmts: InStatement[],
    client: Client
  ) => Promise<InStatement[]> | InStatement[]
): LibSQLPlugin {
  return { beforeBatch: handler };
}

export function afterBatch(
  handler: (
    esults: ResultSet[],
    stmts: InStatement[],
    client: Client
  ) => Promise<ResultSet[]> | ResultSet[]
): LibSQLPlugin {
  return { afterBatch: handler };
}
