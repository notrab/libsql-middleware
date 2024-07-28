# libsql-middleware

The middleware wrapper for `@libsql/client`.

![NPM](https://img.shields.io/npm/v/libsql-middleware)

## Install

```bash
npm install libsql-middleware
```

Make sure to install `@libsql/client` if you don't already have it.

## Quickstart

```ts
import { createClient } from "@libsql/client";
import { beforeExecute, withMiddleware } from "libsql-middleware";

const client = createClient({ url: "file:dev.db" });

const logBeforeExecute = beforeExecute((query) => {
  console.log("Before executing");
  return query;
});

const clientWithHooks = withMiddleware(client, [logBeforeExecute]);

await clientWithHooks.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await clientWithHooks.execute("INSERT INTO users (name) VALUES ('Test User')");
await clientWithHooks.execute("SELECT * FROM users");
```

## API Reference

### `beforeExecute`

```ts
import { beforeExecute } from "libsql-middleware";

const logBeforeExecute = beforeExecute((query) => {
  // Do something
  return query;
});
```

### `afterExecute`

```ts
import { afterExecute } from "libsql-middleware";

const logAfterExecute = afterExecute((result, query) => {
  // Do something
  return result;
});
```

### `beforeBatch`

```ts
import { beforeBatch } from "libsql-middleware";

const logBeforeBatch = beforeBatch((stmts) => {
  // Do something
  return stmts;
});
```

### `afterBatch`

```ts
import { afterBatch } from "libsql-middleware";

const logAfterBatch = afterBatch((results, stmts) => {
  // Do something
  return results;
});
```

### `withMiddleware`

The `withMiddleware` method binds the original `@libsql/client` methods so you can use them as you normally would, but now with middleware.

```ts
import { withMiddleware } from "libsql-middleware";

const clientWithHooks = withMiddleware(client, [
  // Your plugins
]);

// Use the `@libsql/client` as you normally would
// But now with middleware!
await clientWithHooks.execute();
await clientWithHooks.batch();
await clientWithHooks.transaction();
```
