import { Zero } from "@rocicorp/zero";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { exec } from "child_process";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import path from "path";
import { Pool } from "pg";
import { GenericContainer, Network, PullPolicy } from "testcontainers";
import * as drizzleSchema from "../drizzle/schema";
import {
  allTypes,
  filters,
  friendship,
  medium,
  message,
  user,
} from "../drizzle/schema";
import { schema } from "../schema";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";

const PG_PORT = process.env.PG_VERSION === "17" ? 5732 : 5632;
const ZERO_PORT = process.env.PG_VERSION === "17" ? 5949 : 4949;

export const getNewZero = async () => {
  return new Zero({
    server: `http://localhost:${ZERO_PORT}`,
    userID: "1",
    schema: schema,
    kvStore: "mem",
  });
};

const pool = new Pool({
  host: "localhost",
  port: PG_PORT,
  user: "user",
  password: "password",
  database: "drizzle_zero",
});

export const db: NodePgDatabase<typeof drizzleSchema> = drizzle(pool, {
  schema: drizzleSchema,
  casing: "snake_case",
});

export const seed = async () => {
  await db.insert(medium).values({ id: "1", name: "email" });
  await db.insert(medium).values({ id: "2", name: "teams" });
  await db.insert(medium).values({ id: "3", name: "sms" });
  await db.insert(medium).values({ id: "4", name: "whatsapp" });

  await db.insert(filters).values({ id: "1", name: "filter1" });
  await db.insert(filters).values({ id: "2", name: "filter2", parentId: "1" });
  await db.insert(filters).values({ id: "3", name: "filter3", parentId: "1" });

  await db.insert(user).values({
    id: "1",
    name: "James",
    partner: true,
    email: "james@example.com",
    customTypeJson: {
      id: "1",
      custom: "this-is-imported-from-custom-types",
    },
    customInterfaceJson: {
      custom: "this-interface-is-imported-from-custom-types",
    },
    testInterface: {
      nameInterface: "custom-inline-interface",
    },
    testType: {
      nameType: "custom-inline-type",
    },
    testExportedType: {
      nameType: "custom-inline-type",
    },
  });
  await db.insert(user).values({
    id: "2",
    name: "John",
    partner: false,
    email: "john@example.com",
    customTypeJson: {
      id: "2",
      custom: "this-is-imported-from-custom-types",
    },
    customInterfaceJson: {
      custom: "this-interface-is-imported-from-custom-types",
    },
    testInterface: {
      nameInterface: "custom-inline-interface",
    },
    testType: {
      nameType: "custom-inline-type",
    },
    testExportedType: {
      nameType: "custom-inline-type",
    },
  });
  await db.insert(user).values({
    id: "3",
    name: "Jane",
    partner: false,
    email: "jane@example.com",
    customTypeJson: {
      id: "3",
      custom: "this-is-imported-from-custom-types",
    },
    customInterfaceJson: {
      custom: "this-interface-is-imported-from-custom-types",
    },
    testInterface: {
      nameInterface: "custom-inline-interface",
    },
    testType: {
      nameType: "custom-inline-type",
    },
    testExportedType: {
      nameType: "custom-inline-type",
    },
  });

  await db.insert(message).values({
    id: "1",
    body: "Hey, James!",
    senderId: "1",
    mediumId: "1",
    metadata: { key: "value1" },
  });

  await db.insert(message).values({
    id: "2",
    body: "Hello on Teams",
    senderId: "2",
    mediumId: "2",
    metadata: { key: "value2" },
  });

  await db.insert(message).values({
    id: "3",
    body: "SMS message here",
    senderId: "3",
    mediumId: "3",
    metadata: { key: "value3" },
  });

  await db.insert(message).values({
    id: "4",
    body: "WhatsApp message",
    senderId: "2",
    mediumId: "4",
    metadata: { key: "value4" },
  });

  await db.insert(message).values({
    id: "5",
    body: "Thomas!",
    senderId: "1",
    mediumId: "4",
    metadata: { key: "value5" },
  });

  await db.insert(allTypes).values({
    id: "1",
    smallintField: 1,
    integerField: 2,
    bigintField: 95807n,
    bigintNumberField: 444,
    numericField: "8.8",
    decimalField: "9.9",
    realField: 10.8,
    doublePrecisionField: 11.9,
    textField: "text",
    charField: "c",
    uuidField: randomUUID(),
    varcharField: "varchar",
    booleanField: true,
    timestampField: new Date(),
    timestampTzField: new Date(),
    timestampModeString: new Date().toISOString(),
    timestampModeDate: new Date(),
    dateField: new Date().toISOString(),
    jsonField: { key: "value" },
    jsonbField: { key: "value" },
    typedJsonField: { theme: "light", fontSize: 16 },
    statusField: "pending",
  });

  await db.insert(friendship).values({
    requestingId: "1",
    acceptingId: "2",
    accepted: true,
  });
};

export const shutdown = async () => {
  await pool.end();
};

export const startPostgresAndZero = async () => {
  const network = await new Network().start();

  // Start PostgreSQL container
  const postgresContainer = await new PostgreSqlContainer(
    `postgres:${process.env.PG_VERSION ?? "16"}`,
  )
    .withDatabase("drizzle_zero")
    .withUsername("user")
    .withPassword("password")
    .withNetwork(network)
    .withNetworkAliases("postgres-db")
    .withExposedPorts({
      container: 5432,
      host: PG_PORT,
    })
    .withCommand([
      "postgres",
      "-c",
      "wal_level=logical",
      "-c",
      "max_wal_senders=10",
      "-c",
      "max_replication_slots=5",
      "-c",
      "hot_standby=on",
      "-c",
      "hot_standby_feedback=on",
    ])
    .withCopyDirectoriesToContainer([
      {
        source: path.join(__dirname, "../drizzle"),
        target: "/docker-entrypoint-initdb.d",
      },
    ])
    .withPullPolicy(PullPolicy.alwaysPull())
    .start();

  await seed();

  const basePgUrl = `postgresql://${postgresContainer.getUsername()}:${postgresContainer.getPassword()}`;
  const basePgUrlWithInternalPort = `${basePgUrl}@postgres-db:5432`;
  const basePgUrlWithExternalPort = `${basePgUrl}@127.0.0.1:${PG_PORT}`;

  // Start Zero container
  const zeroContainer = await new GenericContainer(`rocicorp/zero:latest`)
    .withExposedPorts({
      container: 4848,
      host: ZERO_PORT,
    })
    .withNetwork(network)
    .withEnvironment({
      ZERO_UPSTREAM_DB: `${basePgUrlWithInternalPort}/drizzle_zero`,
      ZERO_CVR_DB: `${basePgUrlWithInternalPort}/drizzle_zero`,
      ZERO_CHANGE_DB: `${basePgUrlWithInternalPort}/drizzle_zero`,
      ZERO_AUTH_SECRET: "secretkey",
      ZERO_REPLICA_FILE: "/zero.db",
      ZERO_NUM_SYNC_WORKERS: "1",
    })
    .withStartupTimeout(60000)
    .withPullPolicy(PullPolicy.alwaysPull())
    .start();

  await new Promise((resolve, reject) => {
    exec(
      `npx zero-deploy-permissions --schema-path ${path.join(__dirname, "../schema.ts")} --upstream-db ${basePgUrlWithExternalPort}/drizzle_zero`,
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(stdout);
      },
    );
  });

  return {
    postgresContainer,
    zeroContainer,
  };
};
