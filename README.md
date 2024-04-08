# libsql-client-hooks

![NPM](https://img.shields.io/npm/v/libsql-client-hooks)

DO NOT USE. Concept example.

## Usage

```ts
import { createClient } from "@libsql/client";
import {
  type LibSQLPlugin,
  withLibsqlHooks,
  beforeExecute,
  afterExecute,
} from "libsql-client-hooks";

const client = createClient({ url: "file:dev.db" });

const plugins: LibSQLPlugin = {
  beforeExecute: (query) => {
    console.log(`Before executing: ${query}`);
    return query;
  },
  afterExecute: (result, query) => {
    console.log("After executing");
    return result;
  },
};

// Shorter variants
const logBeforeExecute = beforeExecute((query) => {
  console.log("Before executing");
  return result;
});

// Real world example
function isInsertForUsersTable(query: InStatement | string) {
  const insertRegex = /^INSERT\s+INTO\s+users\s+/i;
  return insertRegex.test(typeof query === "string" ? query : query.sql);
}

const sendWelcomeEmail = beforeExecute((result, query) => {
  if (!isInsertForUsersTable(query)) {
    return result;
  }

  // await addJobToQueue(result, query)

  return result;
});

const enhancedClient = withLibsqlHooks(client, [
  plugins,
  sendWelcomeEmail,
  logBeforeExecute,
]);

await enhancedClient.execute("SELECT * FROM users");
```
