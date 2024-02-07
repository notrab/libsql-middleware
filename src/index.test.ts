import { vi, test, expect } from "vitest";
import { createClient } from "@libsql/client";
import { LibSQLPlugin, withLibsqlHooks } from ".";

vi.mock("@libsql/client", () => {
  const mockExecute = vi.fn(async (stmt: string) => ({
    rows: [{ id: 1, name: "Test User" }],
    columns: ["id", "name"],
    rowsAffected: 1,
  }));

  return {
    createClient: vi.fn(() => ({
      execute: mockExecute,
    })),
  };
});

test("should execute plugins before and after query execution", async () => {
  const client = createClient({ url: "libsql://test-db" });
  const beforeExecuteMock = vi.fn((query) => query);
  const afterExecuteMock = vi.fn((result) => result);

  const myPlugin: LibSQLPlugin = {
    beforeExecute: beforeExecuteMock,
    afterExecute: afterExecuteMock,
  };

  const clientWithHooks = withLibsqlHooks(client, [myPlugin]);

  const query = "SELECT * FROM users";
  const result = await clientWithHooks.execute(query);

  expect(beforeExecuteMock).toHaveBeenCalledWith(query, clientWithHooks);

  expect(afterExecuteMock).toHaveBeenCalled();

  expect(result.rows).toEqual([{ id: 1, name: "Test User" }]);
});
