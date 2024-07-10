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
  executeInterceptor?: (
    next: (query: InStatement) => Promise<ResultSet>,
    query: InStatement,
    client: Client
  ) => Promise<ResultSet>;
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

    let executeChain = originalExecute;
    for (const plugin of plugins.slice().reverse()) {
      if (plugin.executeInterceptor) {
        const prevExecute = executeChain;
        executeChain = (query) =>
          plugin.executeInterceptor!(prevExecute, query, client);
      }
    }

    let result = await executeChain(modifiedStmt);

    for (const plugin of plugins) {
      if (plugin.afterExecute) {
        result = await plugin.afterExecute(result, modifiedStmt, client);
      }
    }

    return result;
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

export function executeInterceptor(
  handler: (
    next: (query: InStatement) => Promise<ResultSet>,
    query: InStatement,
    client: Client
  ) => Promise<ResultSet>
): LibSQLPlugin {
  return { executeInterceptor: handler };
}
