import { createClient } from "@libsql/client";
import { withLibsqlHooks, afterExecute } from "libsql-client-hooks";
import ip from "ip";
import { Kafka, logLevel } from "kafkajs";

const client = createClient({ url: "file:dev.db" });

const host = process.env.HOST_IP || ip.address();

const kafka = new Kafka({
  logLevel: logLevel.DEBUG,
  clientId: "my-app",
  brokers: [`${host}:9092`],
});

const producer = kafka.producer();

const topic = "libsql-queries";

const sendToKafka = afterExecute(async (result, query) => {
  console.log("After executing");

  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify({ result, query }) }],
    });
  } catch (error) {
    console.error("Error sending to Kafka:", error);
  }

  return result;
});

const enhancedClient = withLibsqlHooks(client, [sendToKafka]);

await enhancedClient.execute(
  "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
);
await enhancedClient.execute("INSERT INTO users (name) VALUES ('Test User')");
await enhancedClient.execute("SELECT * FROM users");

await producer.disconnect();
