import type { JSONValue } from "@rocicorp/zero";

/**
 * Represents the basic data types supported by Drizzle ORM.
 * These are the fundamental types that can be used in table column definitions.
 */
type DrizzleDataType =
  | "number"
  | "bigint"
  | "boolean"
  | "date"
  | "string"
  | "json";

/**
 * Maps Drizzle data types to their corresponding Zero schema types.
 * This is a constant mapping that ensures type safety when converting between the two systems.
 */
export const drizzleDataTypeToZeroType = {
  number: "number",
  bigint: "number",
  boolean: "boolean",
  date: "number",
  string: "string",
  json: "json",
} as const satisfies Record<DrizzleDataType, string>;

/**
 * Type representation of the Drizzle to Zero type mapping.
 * Extracts the type information from the drizzleDataTypeToZeroType constant.
 */
export type DrizzleDataTypeToZeroType = typeof drizzleDataTypeToZeroType;

/**
 * Represents specific Postgres column types supported by Drizzle ORM.
 * These are more specialized types that need custom handling when converting to Zero.
 */
type DrizzleColumnType = "PgNumeric" | "PgDateString" | "PgTimestampString";

/**
 * Maps Postgres-specific Drizzle column types to their corresponding Zero schema types.
 * Handles special cases where Postgres types need specific Zero type representations.
 */
export const drizzleColumnTypeToZeroType = {
  PgNumeric: "number",
  PgDateString: "number",
  PgTimestampString: "number",
} as const satisfies Record<DrizzleColumnType, string>;

/**
 * Type representation of the Postgres-specific Drizzle to Zero type mapping.
 * Extracts the type information from the drizzleColumnTypeToZeroType constant.
 */
export type DrizzleColumnTypeToZeroType = typeof drizzleColumnTypeToZeroType;

/**
 * Maps Zero schema types to their corresponding TypeScript types.
 */
export type ZeroTypeToTypescriptType = {
  number: number;
  boolean: boolean;
  date: string;
  string: string;
  json: JSONValue;
};
