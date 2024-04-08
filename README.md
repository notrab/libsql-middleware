# libsql-client-hooks

DO NOT USE. Concept example.

## Usage

```ts
import { createClient } from "@libsql/client";
import { type LibSQLPlugin, withLibsqlHooks } from "libsql-client-hooks";

const client = createClient({ url: "file:dev.db" });

const logBeforePlugin: LibSQLPlugin = {
  beforeExecute: (query) => {
    console.log(`Before executing: ${query}`);

    return query;
  },
};

const logAfterPlugin: LibSQLPlugin = {
  afterExecute: (result, query) => {
    console.log("After executing");
    return result;
  },
};

const enhancedClient = withLibsqlHooks(client, [
  logBeforePlugin,
  logAfterPlugin,
]);

await enhancedClient.execute("SELECT * FROM users");
```
