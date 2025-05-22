import { relations, sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  char,
  date,
  doublePrecision,
  integer,
  json,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  smallserial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  CustomJsonType,
  CustomJsonInterface,
} from "drizzle-zero-custom-types";

export interface TestInterface {
  nameInterface: "custom-inline-interface";
}

export type TestExportedType = {
  nameType: "custom-inline-type";
};

type TestType = {
  nameType: "custom-inline-type";
};

const sharedColumns = {
  createdAt: timestamp("createdAt", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updatedAt", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`now()`),
} as const;

export const user = pgTable("user", {
  ...sharedColumns,
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  partner: boolean("partner").notNull(),
  email: text("email").$type<`${string}@${string}`>().notNull(),
  customTypeJson: jsonb("custom_type_json").$type<CustomJsonType>().notNull(),
  customInterfaceJson: jsonb("custom_interface_json")
    .$type<CustomJsonInterface>()
    .notNull(),
  testInterface: jsonb("test_interface").$type<TestInterface>().notNull(),
  testType: jsonb("test_type").$type<TestType>().notNull(),
  testExportedType: jsonb("test_exported_type")
    .$type<TestExportedType>()
    .notNull(),
  status: text("status", { enum: ["ASSIGNED", "COMPLETED"] }),
});

export const userRelations = relations(user, ({ many }) => ({
  messages: many(message),
}));

export const medium = pgTable("medium", {
  ...sharedColumns,
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const mediumRelations = relations(medium, ({ many }) => ({
  messages: many(message),
}));

export const message = pgTable("message", {
  ...sharedColumns,
  id: text("id").primaryKey(),
  senderId: text("senderId").references(() => user.id),
  mediumId: text("mediumId").references(() => medium.id),
  body: text("body").notNull(),
  metadata: jsonb("metadata").$type<{ key: string }>().notNull(),
});

export const messageRelations = relations(message, ({ one }) => ({
  medium: one(medium, {
    fields: [message.mediumId],
    references: [medium.id],
  }),
  sender: one(user, {
    fields: [message.senderId],
    references: [user.id],
  }),
}));

export const statusEnum = pgEnum("status_type", [
  "active",
  "inactive",
  "pending",
]);

export const allTypes = pgTable("all_types", {
  ...sharedColumns,
  id: text("id").primaryKey(),
  smallintField: smallint("smallint").notNull(),
  integerField: integer("integer").notNull(),
  bigintField: bigint("bigint", { mode: "bigint" }).notNull(),
  bigintNumberField: bigint("bigint_number", { mode: "number" }).notNull(),
  smallSerialField: smallserial("smallserial").notNull(),
  serialField: serial("serial").notNull(),
  bigSerialField: bigserial("bigserial", { mode: "number" }).notNull(),
  numericField: numeric("numeric", { precision: 10, scale: 2 }).notNull(),
  decimalField: numeric("decimal", { precision: 10, scale: 2 }).notNull(),
  realField: real("real").notNull(),
  doublePrecisionField: doublePrecision("double_precision").notNull(),
  textField: text("text").notNull(),
  charField: char("char").notNull(),
  uuidField: uuid("uuid").notNull(),
  varcharField: varchar("varchar").notNull(),
  booleanField: boolean("boolean").notNull(),
  timestampField: timestamp("timestamp").notNull(),
  timestampTzField: timestamp("timestamp_tz", { withTimezone: true }).notNull(),
  timestampModeString: timestamp("timestamp_mode_string", {
    mode: "string",
  }).notNull(),
  timestampModeDate: timestamp("timestamp_mode_date", {
    mode: "date",
  }).notNull(),
  dateField: date("date").notNull(),
  jsonField: json("json").notNull(),
  jsonbField: jsonb("jsonb").notNull(),
  typedJsonField: jsonb("typed_json")
    .$type<{ theme: string; fontSize: number }>()
    .notNull(),
  statusField: statusEnum("status").notNull(),
  optionalSmallint: smallint("optional_smallint"),
  optionalInteger: integer("optional_integer"),
  optionalBigint: bigint("optional_bigint", { mode: "number" }),
  optionalNumeric: numeric("optional_numeric", { precision: 10, scale: 2 }),
  optionalReal: real("optional_real"),
  optionalDoublePrecision: doublePrecision("optional_double_precision"),
  optionalText: text("optional_text"),
  optionalBoolean: boolean("optional_boolean"),
  optionalTimestamp: timestamp("optional_timestamp"),
  optionalJson: jsonb("optional_json"),
  optionalEnum: statusEnum("optional_enum"),
  optionalVarchar: varchar("optional_varchar"),
  optionalUuid: uuid("optional_uuid"),
});

// also testing snake case
export const friendship = pgTable(
  "friendship",
  {
    requestingId: text()
      .notNull()
      .references(() => user.id),
    acceptingId: text()
      .notNull()
      .references(() => user.id),
    accepted: boolean().notNull(),
  },
  (t) => [primaryKey({ columns: [t.requestingId, t.acceptingId] })],
);

export const filters = pgTable("filters", {
  id: text("id").primaryKey(),
  name: text("name"),
  parentId: text("parent_id"),
});

export const filtersRelations = relations(filters, ({ one, many }) => ({
  parent: one(filters, {
    fields: [filters.parentId],
    references: [filters.id],
  }),
  children: many(filters),
}));
