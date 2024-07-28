import { vi, test, expect } from "vitest";
import { InStatement, createClient } from "@libsql/client";
import { performance } from "perf_hooks";

import {
  LibSQLPlugin,
  withMiddleware,
  beforeExecute,
  afterExecute,
  beforeBatch,
  executeInterceptor,
} from ".";

vi.mock("@libsql/client", () => {
  const mockExecute = vi.fn(async (stmt: string) => ({
    rows: [{ id: 1, name: "Test User" }],
    columns: ["id", "name"],
    rowsAffected: 1,
  }));

  const mockBatch = vi.fn(async (stmts: string[]) => {
    const results = stmts.map((stmt) => ({
      rows: [{ id: 1, name: "Test User" }],
      columns: ["id", "name"],
      rowsAffected: 1,
    }));

    return results;
  });

  return {
    createClient: vi.fn(() => ({
      execute: mockExecute,
      batch: mockBatch,
    })),
  };
});

global.console.log = vi.fn();

test("should execute plugins before and after query execution", async () => {
  const client = createClient({ url: "libsql://test-db" });
  const beforeExecuteMock = vi.fn((query) => query);
  const afterExecuteMock = vi.fn((result) => result);

  const myPlugin: LibSQLPlugin = {
    beforeExecute: beforeExecuteMock,
    afterExecute: afterExecuteMock,
  };

  const clientWithHooks = withMiddleware(client, [myPlugin]);

  const query = "SELECT * FROM users";
  const result = await clientWithHooks.execute(query);

  expect(beforeExecuteMock).toHaveBeenCalledWith(query, clientWithHooks);

  expect(afterExecuteMock).toHaveBeenCalled();

  expect(result.rows).toEqual([{ id: 1, name: "Test User" }]);
});

test("should log before and after executing a query", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const logBeforePlugin: LibSQLPlugin = {
    beforeExecute: (query) => {
      console.log(`Before executing: ${query}`);

      return query;
    },
  };

  const logAfterPlugin: LibSQLPlugin = {
    afterExecute: (result) => {
      console.log("After executing");
      return result;
    },
  };

  const enhancedClient = withMiddleware(client, [
    logBeforePlugin,
    logAfterPlugin,
  ]);

  await enhancedClient.execute("SELECT * FROM users");

  expect(console.log).toHaveBeenCalledWith(
    "Before executing: SELECT * FROM users"
  );

  expect(console.log).toHaveBeenCalledWith("After executing");
});

test("afterExecute plugin returns result and query in that order", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const resultToReturn = {
    columns: ["id", "name"],
    rows: [{ id: 1, name: "Test User" }],
    rowsAffected: 1,
  };

  const myPlugin: LibSQLPlugin = {
    afterExecute: (result, query) => {
      expect(result).toEqual(resultToReturn);
      expect(query).toEqual("SELECT * FROM users");
      return result;
    },
  };

  const clientWithHooks = withMiddleware(client, [myPlugin]);

  const query = "SELECT * FROM users";
  const result = await clientWithHooks.execute(query);

  expect(result).toEqual(resultToReturn);
});

test("beforeExecute and afterExecute plugins work correctly", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const beforePlugin: LibSQLPlugin = beforeExecute(async (query) => {
    console.log("Modifying query before execution");
    return query;
  });

  const afterPlugin: LibSQLPlugin = afterExecute(async (result) => {
    console.log("Modifying result after execution");
    return result;
  });

  const clientWithHooks = withMiddleware(client, [beforePlugin, afterPlugin]);

  const query = "SELECT * FROM users";

  await clientWithHooks.execute(query);

  expect(console.log).toHaveBeenCalledWith("Modifying query before execution");
  expect(console.log).toHaveBeenCalledWith("Modifying result after execution");
});

const measureExecutionTime = (fn: () => void): number => {
  const startTime = performance.now();
  fn();
  const endTime = performance.now();
  return endTime - startTime;
};

test("Benchmark operations and plugins", async ({ expect }) => {
  const client = createClient({ url: "file:dev.db" });

  const logBeforePlugin: LibSQLPlugin = {
    beforeExecute: async (query) => {
      console.log(`Before executing: ${query}`);
      // Simulate an async operation
      await new Promise((resolve) => setTimeout(resolve, 100));
      return query;
    },
  };

  const logAfterPlugin: LibSQLPlugin = {
    afterExecute: async (result, query) => {
      console.log("After executing");
      // Simulate an async operation
      await new Promise((resolve) => setTimeout(resolve, 50));
      return result;
    },
  };

  const enhancedClient = withMiddleware(client, [
    logBeforePlugin,
    logAfterPlugin,
  ]);

  const queryToExecute = "SELECT * FROM users";

  const executionTimeWithPlugins = measureExecutionTime(() =>
    enhancedClient.execute(queryToExecute)
  );

  const executionTimeWithoutPlugins = measureExecutionTime(() =>
    client.execute(queryToExecute)
  );

  expect(executionTimeWithPlugins).toBeGreaterThan(executionTimeWithoutPlugins);
});

function isInsertForUsersTable(query: InStatement | string) {
  const insertRegex = /^INSERT\s+INTO\s+users\s+/i;
  return insertRegex.test(typeof query === "string" ? query : query.sql);
}

test("Before hook checks if the query is an INSERT for the users table", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const afterPlugin = afterExecute((result, query) => {
    if (!isInsertForUsersTable(query)) {
      return result;
    }

    console.log("Executing INSERT for the users table");

    return result;
  });

  const clientWithHooks = withMiddleware(client, [afterPlugin]);

  const insertQuery = "INSERT INTO users (name, age) VALUES ('John Doe', 30)";
  await clientWithHooks.execute(insertQuery);

  const selectQuery = "SELECT * FROM products";
  await clientWithHooks.execute(selectQuery);

  expect(console.log).toHaveBeenCalledWith(
    "Executing INSERT for the users table"
  );
});

test("should execute beforeBatch hook for batch commands", async () => {
  const beforeBatchPlugin = beforeBatch((stmts) => {
    stmts.map((stmt) => {
      if (typeof stmt === "string") {
        console.log(stmt.toUpperCase());
      } else {
        console.log({ ...stmt, sql: stmt.sql.toUpperCase() });
      }
    });

    return stmts;
  });

  const client = createClient({ url: "libsql://test-db" });
  const clientWithHooks = await withMiddleware(client, [beforeBatchPlugin]);

  const stmts = [
    { sql: "SELECT * FROM table1", args: {} },
    { sql: "SELECT * FROM table2", args: {} },
  ];

  await clientWithHooks.batch(stmts);

  stmts.forEach((stmt) => {
    if (typeof stmt === "string") {
      expect(console.log).toHaveBeenCalledWith((stmt as string).toUpperCase());
    } else {
      expect(console.log).toHaveBeenCalledWith({
        ...stmt,
        sql: stmt.sql.toUpperCase(),
      });
    }
  });
});

test("executeInterceptor should intercept and modify query execution", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const interceptorPlugin = executeInterceptor(async (next, query, client) => {
    console.log(`Intercepted query: ${query}`);
    const modifiedQuery =
      typeof query === "string"
        ? query.toLowerCase()
        : { ...query, sql: query.sql.toLowerCase() };
    const result = await next(modifiedQuery);
    console.log("Query executed successfully");
    return result;
  });

  const clientWithHooks = withMiddleware(client, [interceptorPlugin]);

  const query = "SELECT * FROM USERS";
  const result = await clientWithHooks.execute(query);

  expect(console.log).toHaveBeenCalledWith(
    "Intercepted query: SELECT * FROM USERS"
  );
  expect(console.log).toHaveBeenCalledWith("Query executed successfully");
  expect(result.rows).toEqual([{ id: 1, name: "Test User" }]);
});

test("executeInterceptor should allow multiple interceptors", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const interceptor1 = executeInterceptor(async (next, query) => {
    console.log("Interceptor 1: Before execution");
    const result = await next(query);
    console.log("Interceptor 1: After execution");
    return result;
  });

  const interceptor2 = executeInterceptor(async (next, query) => {
    console.log("Interceptor 2: Before execution");
    const result = await next(query);
    console.log("Interceptor 2: After execution");
    return result;
  });

  const clientWithHooks = withMiddleware(client, [interceptor1, interceptor2]);

  const query = "SELECT * FROM users";
  await clientWithHooks.execute(query);

  expect(console.log).toHaveBeenCalledWith("Interceptor 1: Before execution");
  expect(console.log).toHaveBeenCalledWith("Interceptor 2: Before execution");
  expect(console.log).toHaveBeenCalledWith("Interceptor 2: After execution");
  expect(console.log).toHaveBeenCalledWith("Interceptor 1: After execution");
});

test("executeInterceptor should work alongside beforeExecute and afterExecute", async () => {
  const client = createClient({ url: "libsql://test-db" });

  const beforeExecutePlugin: LibSQLPlugin = {
    beforeExecute: (query) => {
      console.log("beforeExecute called");
      return query;
    },
  };

  const interceptorPlugin = executeInterceptor(async (next, query, client) => {
    console.log("executeInterceptor: Before execution");
    const result = await next(query);
    console.log("executeInterceptor: After execution");
    return result;
  });

  const afterExecutePlugin: LibSQLPlugin = {
    afterExecute: (result, query) => {
      console.log("afterExecute called");
      return result;
    },
  };

  const clientWithHooks = withMiddleware(client, [
    beforeExecutePlugin,
    interceptorPlugin,
    afterExecutePlugin,
  ]);

  const query = "SELECT * FROM users";
  await clientWithHooks.execute(query);

  expect(console.log).toHaveBeenCalledWith("beforeExecute called");
  expect(console.log).toHaveBeenCalledWith(
    "executeInterceptor: Before execution"
  );
  expect(console.log).toHaveBeenCalledWith(
    "executeInterceptor: After execution"
  );
  expect(console.log).toHaveBeenCalledWith("afterExecute called");
});
