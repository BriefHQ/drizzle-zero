import type { Schema, TableSchema } from "@rocicorp/zero";
import { expect } from "vitest";

export type ZeroTableSchema = TableSchema;
export type ZeroSchema = Schema;

export function expectTableSchemaDeepEqual<S extends ZeroTableSchema>(
  actual: S,
) {
  return {
    toEqual(expected: S, depth = 0) {
      if (depth > 10) {
        // the comparison is only checking the first 10 levels of relationships
        // to avoid infinite loops
        return;
      }

      expect(Object.keys(actual.columns)).toStrictEqual(
        Object.keys(expected.columns),
      );

      for (const key of Object.keys(actual.columns)) {
        expect({
          ...(actual.columns[key as keyof typeof actual.columns] as object),
          __testKey: key,
        }).toStrictEqual({
          ...(expected.columns[key as keyof typeof expected.columns] as object),
          __testKey: key,
        });
      }

      expect(actual.primaryKey).toStrictEqual(expected.primaryKey);
      expect(actual.tableName).toStrictEqual(expected.tableName);

      expect(Object.keys(actual.relationships || {})).toStrictEqual(
        Object.keys(expected.relationships || {}),
      );

      if (expected.relationships) {
        for (const key of Object.keys(expected.relationships)) {
          expect(
            (
              actual.relationships?.[
                key as keyof typeof actual.relationships
              ] as {
                sourceField: string;
              }
            )?.sourceField,
          ).toStrictEqual(
            (
              expected.relationships?.[
                key as keyof typeof expected.relationships
              ] as {
                sourceField: string;
              }
            )?.sourceField,
          );

          expect(
            (
              actual.relationships?.[
                key as keyof typeof actual.relationships
              ] as {
                destField: string;
              }
            )?.destField,
          ).toStrictEqual(
            (
              expected.relationships?.[
                key as keyof typeof expected.relationships
              ] as {
                destField: string;
              }
            )?.destField,
          );

          expectTableSchemaDeepEqual(
            (
              actual.relationships?.[
                key as keyof typeof actual.relationships
              ] as { destSchema: () => ZeroTableSchema }
            )?.destSchema(),
          ).toEqual(
            (
              expected.relationships?.[
                key as keyof typeof expected.relationships
              ] as { destSchema: () => ZeroTableSchema }
            )?.destSchema(),
            depth + 1,
          );
        }
      }
    },
  };
}

export function expectSchemaDeepEqual<S extends ZeroSchema>(actual: S) {
  return {
    toEqual(expected: S) {
      expect(actual.version).toStrictEqual(expected.version);

      expect(Object.keys(actual.tables)).toStrictEqual(
        Object.keys(expected.tables),
      );

      for (const key of Object.keys(actual.tables)) {
        expectTableSchemaDeepEqual(
          actual.tables[key as keyof typeof actual.tables]!,
        ).toEqual(expected.tables[key as keyof typeof expected.tables]!);
      }
    },
  };
}

export function Expect<_ extends true>() {}

export type Equal<X, Y extends X> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;

export type AtLeastOne<T> = [T, ...T[]];
