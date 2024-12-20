import type { TableSchema } from "@rocicorp/zero";
import { Table } from "drizzle-orm";
import { expect } from "vitest";
import type { ColumnsConfig, CreateZeroSchema } from "../src";

export type ZeroTableSchema = TableSchema;

export function expectDeepEqual<
  S extends ZeroTableSchema,
  T extends Table,
  C extends ColumnsConfig<T>,
>(actual: CreateZeroSchema<T, C>) {
  return {
    toEqual(expected: S) {
      expect(Object.keys(actual.columns)).toStrictEqual(
        Object.keys(expected.columns),
      );

      for (const key of Object.keys(actual.columns)) {
        expect(
          actual.columns[key as keyof typeof actual.columns],
        ).toStrictEqual(expected.columns[key as keyof typeof expected.columns]);
      }

      expect(actual.primaryKey).toStrictEqual(expected.primaryKey);
      expect(actual.tableName).toStrictEqual(expected.tableName);

      expect(actual).toStrictEqual(expected);
    },
  };
}
export function Expect<_ extends true>() {}

export type Equal<X, Y extends X> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type NotEqual<X, Y extends X> = Equal<X, Y> extends true ? false : true;
