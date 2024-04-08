import { Client } from "@upstash/qstash";
import { createClient } from "@libsql/client";
import { type LibSQLPlugin, withLibsqlHooks } from "libsql-client-hooks";

const libsqlClient = createClient({ url: "file:dev.db" });

const qstash = new Client({
  token: "...",
});

const sendToQueueForProcessing: LibSQLPlugin = {
  afterExecute: async (result, query) => {
    console.log("After executing");

    const res = await qstash.publishJSON({
      url: "...",
      body: {
        query,
        result,
      },
    });

    console.log(res);

    return result;
  },
};

const enhancedClient = withLibsqlHooks(libsqlClient, [
  sendToQueueForProcessing,
]);

await enhancedClient.execute("INSERT INTO users (name) VALUES ('Test User')");
