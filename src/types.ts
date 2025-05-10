import type { Relations, Table } from "drizzle-orm";
import type { ColumnsConfig } from "./tables";

/**
 * Gets the keys of columns that can be used as indexes.
 * @template TTable - The table to get index keys from
 */
export type ColumnIndexKeys<TTable extends Table> = {
  [K in keyof Columns<TTable>]: K;
}[keyof Columns<TTable>];

/**
 * Configuration type for specifying which tables and columns to include in the Zero schema.
 * @template TDrizzleSchema - The complete Drizzle schema
 */
export type TableColumnsConfig<TDrizzleSchema extends Record<string, unknown>> =
  Flatten<{
    /**
     * The columns to include in the Zero schema.
     */
    readonly [K in keyof TDrizzleSchema as TDrizzleSchema[K] extends Table<any>
      ? K
      : never]: TDrizzleSchema[K] extends Table<any>
      ? ColumnsConfig<TDrizzleSchema[K]>
      : never;
  }>;

/**
 * A default config type which includes all tables in the Drizzle schema.
 * @template TDrizzleSchema - The complete Drizzle schema
 */
export type DefaultTableColumnsConfig<
  TDrizzleSchema extends Record<string, unknown>,
> = Flatten<{
  readonly [K in keyof TDrizzleSchema as TDrizzleSchema[K] extends Table<any>
    ? K
    : never]: TDrizzleSchema[K] extends Table<any>
    ? DefaultColumnsConfig<TDrizzleSchema[K]>
    : never;
}>;

/**
 * A default config type which includes all columns in a Drizzle table.
 * @template TTable - The Drizzle table type
 */
export type DefaultColumnsConfig<TTable extends Table> = {
  readonly [K in ColumnNames<TTable>]: true;
};

/**
 * Extracts the table name from a Drizzle table type.
 * @template TTable The Drizzle table type
 */
export type TableName<TTable extends Table> = TTable["_"]["name"];

/**
 * Gets all columns from a Drizzle table type.
 * @template TTable The Drizzle table type
 */
export type Columns<TTable extends Table> = TTable["_"]["columns"];

/**
 * Gets all column names from a Drizzle table type.
 * @template TTable The Drizzle table type
 */
export type ColumnNames<TTable extends Table> = keyof Columns<TTable>;

/**
 * Helper type that extracts primary key columns from a table.
 * @template T The Drizzle table type
 */
type PrimaryKeyColumns<T extends Table> = {
  [K in keyof Columns<T>]: Columns<T>[K]["_"]["isPrimaryKey"] extends true
    ? K extends string
      ? K
      : never
    : never;
}[keyof Columns<T>];

/**
 * Gets the keys of text columns from a Drizzle table type.
 *
 * This is a workaround for a fallback for compound primary keys that are not
 * typed strongly by Drizzle ORM.
 *
 * @template TTable The Drizzle table type
 */
export type TextColumnKeys<TTable extends Table> = {
  [K in keyof Columns<TTable>]: Columns<TTable>[K]["_"] extends {
    notNull: true;
    columnType: "PgText" | "PgChar" | "PgVarchar";
  }
    ? K
    : never;
}[keyof Columns<TTable>];

/**
 * Finds the primary key(s) from a table.
 * @template T The Drizzle table type
 */
export type FindPrimaryKeyFromTable<T extends Table> = [
  PrimaryKeyColumns<T>,
] extends [never]
  ? [never]
  : [PrimaryKeyColumns<T>];

/**
 * Finds relations defined for a specific table in the Drizzle schema.
 * @template TDrizzleSchema The complete Drizzle schema
 * @template TTable The table to find relations for
 */
export type FindRelationsForTable<
  TDrizzleSchema extends { [K in string]: unknown },
  TTable extends Table,
> = Extract<
  TDrizzleSchema[{
    [P in keyof TDrizzleSchema]: TDrizzleSchema[P] extends Relations<
      TableName<TTable>
    >
      ? P
      : never;
  }[keyof TDrizzleSchema]],
  Relations<TableName<TTable>>
>;

/**
 * Type guard that checks if a type is a Table with a specific name.
 * @template T The type to check
 * @template Name The name to check for
 */
type IsTableWithName<T, Name extends string> = T extends { _: { name: Name } }
  ? T extends Table<any>
    ? true
    : false
  : false;

/**
 * Finds a table in the schema by its name.
 * @template TDrizzleSchema The complete Drizzle schema
 * @template Name The name of the table to find
 */
export type FindTableByName<
  TDrizzleSchema extends Record<string, unknown>,
  Name extends string,
> = Extract<
  {
    [P in keyof TDrizzleSchema]: IsTableWithName<
      TDrizzleSchema[P],
      Name
    > extends true
      ? TDrizzleSchema[P]
      : never;
  }[keyof TDrizzleSchema],
  Table<any>
>;

/**
 * Finds a table in the schema by its key.
 * @template TDrizzleSchema The complete Drizzle schema
 * @template Key The key of the table to find in the schema
 */
export type FindTableByKey<
  TDrizzleSchema extends Record<string, unknown>,
  Key extends keyof TDrizzleSchema,
> = TDrizzleSchema[Key] extends Table<any> ? TDrizzleSchema[Key] : never;

/**
 * Finds the key of a table in the schema by its name.
 * @template TDrizzleSchema The complete Drizzle schema
 * @template Name The name of the table to find in the schema
 */
export type FindTableKeyByTableName<
  TDrizzleSchema extends Record<string, unknown>,
  Name extends string,
> = keyof {
  [K in keyof TDrizzleSchema as TDrizzleSchema[K] extends Table<any>
    ? TDrizzleSchema[K]["_"]["name"] extends Name
      ? K
      : never
    : never]: any;
};

/**
 * Extracts the configuration type from a Relations type.
 * @template T The Relations type to extract config from
 */
export type RelationsConfig<T extends Relations> = ReturnType<T["config"]>;

/**
 * Type guard that checks if a string has a capital letter.
 * @template S The string to check
 */
export type HasCapital<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? First extends Uppercase<First>
      ? First extends Lowercase<First>
        ? HasCapital<Rest>
        : true
      : HasCapital<Rest>
    : false;

/**
 * Utility type that flattens an object type by removing any intermediate interfaces.
 * @template T The type to flatten
 */
export type Flatten<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Utility type that ensures an array has at least one element.
 * @template T The type of elements in the array
 */
export type AtLeastOne<T> = readonly [T, ...T[]];

/**
 * Utility type that converts a union to a tuple.
 * @template T The union type to convert
 */
export type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];
