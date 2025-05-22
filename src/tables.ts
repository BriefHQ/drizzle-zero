import {
  type ColumnBuilder,
  type ReadonlyJSONValue,
  type TableBuilderWithColumns,
  boolean as zeroBoolean,
  enumeration as zeroEnumeration,
  json as zeroJson,
  number as zeroNumber,
  string as zeroString,
  table as zeroTable,
} from "@rocicorp/zero";
import { getTableColumns, getTableName, Table } from "drizzle-orm";
import { toCamelCase, toSnakeCase } from "drizzle-orm/casing";
import { getTableConfigForDatabase } from "./db";
import {
  type DrizzleColumnTypeToZeroType,
  drizzleColumnTypeToZeroType,
  type DrizzleDataTypeToZeroType,
  drizzleDataTypeToZeroType,
  type ZeroTypeToTypescriptType,
} from "./drizzle-to-zero";
import type {
  ColumnNames,
  Columns,
  FindPrimaryKeyFromTable,
  Flatten,
  HasCapital,
} from "./types";
import { debugLog, typedEntries } from "./util";

export type { ColumnBuilder, ReadonlyJSONValue, TableBuilderWithColumns };

/**
 * Represents a column definition from a Drizzle table, filtered by column name.
 * @template TTable The Drizzle table type
 * @template K The column name to filter by
 */
type ColumnDefinition<TTable extends Table, K extends ColumnNames<TTable>> = {
  [C in keyof Columns<TTable>]: C extends K ? Columns<TTable>[C] : never;
}[keyof Columns<TTable>];

/**
 * The type override for a column.
 * Used to customize how a Drizzle column is mapped to a Zero schema.
 * @template TCustomType The TypeScript type that corresponds to the Zero type
 */
type TypeOverride<TCustomType> = {
  readonly type: "string" | "number" | "boolean" | "json";
  readonly optional: boolean;
  readonly customType: TCustomType;
  readonly kind?: "enum";
};

/**
 * Configuration for specifying which columns to include in the Zero schema and how to map them.
 * @template TTable The Drizzle table type
 */
export type ColumnsConfig<TTable extends Table> =
  | false
  | Flatten<{
      /**
       * The columns to include in the Zero schema.
       * Set to true to use default mapping, or provide a TypeOverride for custom mapping.
       */
      readonly [KColumn in ColumnNames<TTable>]:
        | boolean
        | ColumnBuilder<
            TypeOverride<
              ZeroTypeToTypescriptType[DrizzleDataTypeToZeroType[Columns<TTable>[KColumn]["dataType"]]]
            >
          >;
    }>;

/**
 * Maps a Drizzle column type to its corresponding Zero type.
 * @template TTable The Drizzle table type
 * @template KColumn The column name
 * @template CD The column definition type
 */
type ZeroMappedColumnType<
  TTable extends Table,
  KColumn extends ColumnNames<TTable>,
  CD extends ColumnDefinition<TTable, KColumn>["_"] = ColumnDefinition<
    TTable,
    KColumn
  >["_"],
> = CD extends {
  columnType: keyof DrizzleColumnTypeToZeroType;
}
  ? DrizzleColumnTypeToZeroType[CD["columnType"]]
  : DrizzleDataTypeToZeroType[CD["dataType"]];

/**
 * Maps a Drizzle column to its corresponding TypeScript type in Zero.
 * Handles special cases like enums and custom types.
 * @template TTable The Drizzle table type
 * @template KColumn The column name
 * @template CD The column definition type
 */
type ZeroMappedCustomType<
  TTable extends Table,
  KColumn extends ColumnNames<TTable>,
  CD extends ColumnDefinition<TTable, KColumn>["_"] = ColumnDefinition<
    TTable,
    KColumn
  >["_"],
> = CD extends {
  columnType: "PgEnumColumn";
}
  ? CD["data"]
  : CD extends {
    columnType: "PgText";
    enumValues: string[];
  }
    ? CD["enumValues"][number]
    : CD extends { $type: any }
    ? CD["$type"]
    : ZeroTypeToTypescriptType[ZeroMappedColumnType<TTable, KColumn>];

/**
 * Defines the structure of a column in the Zero schema.
 * @template TTable The Drizzle table type
 * @template KColumn The column name
 * @template CD The column definition type
 */
type ZeroColumnDefinition<
  TTable extends Table,
  KColumn extends ColumnNames<TTable>,
  TCasing extends ZeroTableCasing,
  CD extends ColumnDefinition<TTable, KColumn>["_"] = ColumnDefinition<
    TTable,
    KColumn
  >["_"],
  BaseDefinition extends {
    optional: false;
    type: ZeroMappedColumnType<TTable, KColumn>;
    customType: ZeroMappedCustomType<TTable, KColumn>;
  } = {
    optional: false;
    type: ZeroMappedColumnType<TTable, KColumn>;
    customType: ZeroMappedCustomType<TTable, KColumn>;
  },
  BaseOptional extends Omit<BaseDefinition, "optional"> & {
    optional: true;
  } = Omit<BaseDefinition, "optional"> & { optional: true },
> = (CD extends {
  hasDefault: true;
  hasRuntimeDefault: false;
}
  ? BaseOptional
  : CD extends { notNull: true }
    ? BaseDefinition
    : Omit<BaseDefinition, "optional"> & { optional: true }) &
  (CD extends { name: KColumn }
    ? TCasing extends "snake_case"
      ? HasCapital<CD["name"]> extends true
        ? { serverName: string }
        : {}
      : TCasing extends "camelCase"
        ? HasCapital<CD["name"]> extends false
          ? { serverName: string }
          : {}
        : {}
    : { serverName: string });

/**
 * Maps the columns configuration to their Zero schema definitions.
 * @template TTable The Drizzle table type
 * @template TColumnConfig The columns configuration
 */
export type ZeroColumns<
  TTable extends Table,
  TColumnConfig extends ColumnsConfig<TTable>,
  TCasing extends ZeroTableCasing,
> = {
  [KColumn in keyof TColumnConfig as TColumnConfig[KColumn] extends
    | true
    | ColumnBuilder<any>
    ? KColumn
    : never]: KColumn extends ColumnNames<TTable>
    ? TColumnConfig[KColumn] extends ColumnBuilder<any>
      ? TColumnConfig[KColumn]["schema"]
      : TColumnConfig[KColumn] extends true
        ? Flatten<ZeroColumnDefinition<TTable, KColumn, TCasing>>
        : never
    : never;
};

/**
 * Represents the underlying schema for a Zero table.
 * @template TTableName The name of the table
 * @template TTable The Drizzle table type
 * @template TColumnConfig The columns configuration
 */
export type ZeroTableBuilderSchema<
  TTableName extends string,
  TTable extends Table,
  TColumnConfig extends ColumnsConfig<TTable>,
  TCasing extends ZeroTableCasing,
> = {
  name: TTableName;
  primaryKey: FindPrimaryKeyFromTable<TTable> extends [never]
    ? readonly [string, ...string[]]
    : readonly [string, ...string[]] & FindPrimaryKeyFromTable<TTable>;
  columns: Flatten<ZeroColumns<TTable, TColumnConfig, TCasing>>;
}; // Zero does not support this properly yet: & (TTable['_']['name'] extends TTableName ? {} : { serverName: string });

/**
 * Represents the complete Zero schema for a Drizzle table.
 * @template TTableName The name of the table
 * @template TTable The Drizzle table type
 * @template TColumnConfig The columns configuration
 */
type ZeroTableBuilder<
  TTableName extends string,
  TTable extends Table,
  TColumnConfig extends ColumnsConfig<TTable>,
  TCasing extends ZeroTableCasing,
> = TableBuilderWithColumns<
  Readonly<ZeroTableBuilderSchema<TTableName, TTable, TColumnConfig, TCasing>>
>;

/**
 * Casing for the Zero table builder.
 */
export type ZeroTableCasing = "snake_case" | "camelCase" | undefined;

/**
 * Creates a Zero schema from a Drizzle table definition.
 *
 * @returns A Zero schema definition for the table
 * @throws {Error} If primary key configuration is invalid or column types are unsupported
 */
const createZeroTableBuilder = <
  TTableName extends string,
  TTable extends Table,
  TColumnConfig extends ColumnsConfig<TTable>,
  TCasing extends ZeroTableCasing = ZeroTableCasing,
>(
  /**
   * The mapped name of the table
   */
  tableName: TTableName,
  /**
   * The Drizzle table instance
   */
  table: TTable,
  /**
   * Configuration specifying which columns to include and how to map them
   */
  columns?: TColumnConfig,
  /**
   * Whether to enable debug mode.
   */
  debug?: boolean,
  /**
   * The casing to use for the table name.
   */
  casing?: TCasing,
): ZeroTableBuilder<TTableName, TTable, TColumnConfig, TCasing> => {
  const actualTableName = getTableName(table);
  const tableColumns = getTableColumns(table);
  const tableConfig = getTableConfigForDatabase(table);

  const primaryKeysFromColumns: string[] = [];

  const columnsMapped = typedEntries(tableColumns).reduce(
    (acc, [key, column]) => {
      const columnConfig = columns?.[key as keyof TColumnConfig];

      if (columnConfig === false) {
        debugLog(
          debug,
          `Skipping column ${String(key)} because columnConfig is false`,
        );

        return acc;
      }

      // From https://github.com/drizzle-team/drizzle-orm/blob/e5c63db0df0eaff5cae8321d97a77e5b47c5800d/drizzle-kit/src/serializer/utils.ts#L5
      const resolvedColumnName =
        !column.keyAsName || casing === undefined
          ? column.name
          : casing === "camelCase"
            ? toCamelCase(column.name)
            : toSnakeCase(column.name);

      if (
        typeof columnConfig !== "boolean" &&
        typeof columnConfig !== "object" &&
        typeof columnConfig !== "undefined"
      ) {
        throw new Error(
          `drizzle-zero: Invalid column config for column ${resolvedColumnName} - expected boolean or ColumnBuilder but was ${typeof columnConfig}`,
        );
      }

      const isColumnBuilder = (value: unknown): value is ColumnBuilder<any> =>
        typeof value === "object" && value !== null && "schema" in value;

      const type =
        drizzleColumnTypeToZeroType[
          column.columnType as keyof DrizzleColumnTypeToZeroType
        ] ??
        drizzleDataTypeToZeroType[
          column.dataType as keyof DrizzleDataTypeToZeroType
        ] ??
        null;

      if (type === null) {
        throw new Error(
          `drizzle-zero: Unsupported column type: ${column.columnType} (${column.dataType}). It must be supported by Zero, e.g.: ${Object.keys({ ...drizzleDataTypeToZeroType, ...drizzleColumnTypeToZeroType }).join(" | ")}`,
        );
      }

      const isColumnOptional =
        typeof columnConfig === "boolean" || typeof columnConfig === "undefined"
          ? column.hasDefault && column.defaultFn === undefined
            ? true
            : !column.notNull
          : isColumnBuilder(columnConfig)
            ? columnConfig.schema.optional
            : false;

      if (column.primary) {
        primaryKeysFromColumns.push(String(key));
      }

      if (columnConfig && typeof columnConfig !== "boolean") {
        return {
          ...acc,
          [key]: columnConfig,
        };
      }

      const schemaValue = column.enumValues
        ? zeroEnumeration<typeof column.enumValues>()
        : type === "string"
          ? zeroString()
          : type === "number"
            ? zeroNumber()
            : type === "json"
              ? zeroJson()
              : zeroBoolean();

      const schemaValueWithFrom =
        resolvedColumnName !== key
          ? schemaValue.from(resolvedColumnName)
          : schemaValue;

      return {
        ...acc,
        [key]: isColumnOptional
          ? schemaValueWithFrom.optional()
          : schemaValueWithFrom,
      };
    },
    {} as Record<string, any>,
  );

  const primaryKeys = [
    ...primaryKeysFromColumns,
    ...tableConfig.primaryKeys.flatMap((k) =>
      k.columns.map((c) =>
        getDrizzleColumnKeyFromColumnName({
          columnName: c.name,
          table: c.table,
        }),
      ),
    ),
  ];

  if (!primaryKeys.length) {
    throw new Error(
      `drizzle-zero: No primary keys found in table - ${actualTableName}. Did you forget to define a primary key?`,
    );
  }

  const resolvedTableName = tableConfig.schema
    ? `${tableConfig.schema}.${actualTableName}`
    : actualTableName;

  const zeroBuilder = zeroTable(tableName);

  const zeroBuilderWithFrom =
    resolvedTableName !== tableName
      ? zeroBuilder.from(resolvedTableName)
      : zeroBuilder;

  return zeroBuilderWithFrom
    .columns(columnsMapped)
    .primaryKey(...primaryKeys) as ZeroTableBuilder<
    TTableName,
    TTable,
    TColumnConfig,
    TCasing
  >;
};

/**
 * Get the key of a column in the schema from the column name.
 * @param columnName - The name of the column to get the key for
 * @param table - The table to get the column key from
 * @returns The key of the column in the schema
 */
const getDrizzleColumnKeyFromColumnName = ({
  columnName,
  table,
}: {
  columnName: string;
  table: Table;
}) => {
  const tableColumns = getTableColumns(table);

  return typedEntries(tableColumns).find(
    ([_name, column]) => column.name === columnName,
  )?.[0]!;
};

export {
  createZeroTableBuilder,
  getDrizzleColumnKeyFromColumnName,
  type ZeroTableBuilder,
};
