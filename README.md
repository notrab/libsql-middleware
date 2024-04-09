# libsql-client-hooks

The middleware wrapper for `@libsql/client`.

![NPM](https://img.shields.io/npm/v/libsql-client-hooks)

## Install

```bash
npm install libsql-client-hooks
```

Make sure to install `@libsql/client` if you don't already have it.

## Quickstart

```ts
import { createClient } from "@libsql/client";
import { beforeExecute, withLibsqlHooks } from "libsql-client-hooks";

const client = createClient({ url: "file:dev.db" });

const logBeforeExecute = beforeExecute((query) => {
  console.log("Before executing");
  return query;
});

const clientWithHooks = withLibsqlHooks(client, [logBeforeExecute]);

await clientWithHooks.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await clientWithHooks.execute("INSERT INTO users (name) VALUES ('Test User')");
await clientWithHooks.execute("SELECT * FROM users");
```

## API Reference

### `beforeExecute`

```ts
import { beforeExecute } from "libsql-client-hooks";

const logBeforeExecute = beforeExecute((query) => {
  // Do something
  return query;
});
```

### `afterExecute`

```ts
import { afterExecute } from "libsql-client-hooks";

const logAfterExecute = afterExecute((result, query) => {
  // Do something
  return result;
});
```

### `beforeBatch`

```ts
import { beforeBatch } from "libsql-client-hooks";

const logBeforeBatch = beforeBatch((stmts) => {
  // Do something
  return stmts;
});
```

### `afterBatch`

```ts
import { afterBatch } from "libsql-client-hooks";

const logAfterBatch = afterBatch((results, stmts) => {
  // Do something
  return results;
});
```

### `withLibsqlHooks`

```ts
import { withLibsqlHooks } from "libsql-client-hooks";

const clientWithHooks = withLibsqlHooks(client, [
  // Your plugins
]);

// Use the `@libsql/client` as you normally would
// But now with middleware!
await clientWithHooks.execute();
await clientWithHooks.batch();
await clientWithHooks.transaction();
```
