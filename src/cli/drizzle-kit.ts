import type { Config } from "drizzle-kit";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Project } from "ts-morph";
import { tsImport } from "tsx/esm/api";
import { drizzleZeroConfig, type DrizzleToZeroSchema } from "../relations";

export const getDefaultConfig = async ({
  drizzleSchemaPath,
  drizzleKitConfigPath,
  tsProject,
}: {
  drizzleSchemaPath: string | undefined;
  drizzleKitConfigPath: string | undefined;
  tsProject: Project;
}) => {
  const resolvedDrizzleSchemaPath = await getFullDrizzleSchemaFilePath({
    drizzleSchemaPath,
    drizzleKitConfigPath,
  });

  const drizzleSchema = await tsImport(resolvedDrizzleSchemaPath, __filename);

  const zeroSchema = drizzleZeroConfig(drizzleSchema);

  return {
    type: "drizzle-kit",
    zeroSchema: zeroSchema as DrizzleToZeroSchema<any> | undefined,
    drizzleSchemaSourceFile: await getDrizzleSchemaSourceFile({
      tsProject,
      drizzleSchemaPath: resolvedDrizzleSchemaPath,
    }),
  } as const;
};

export const getFullDrizzleSchemaFilePath = async ({
  drizzleKitConfigPath,
  drizzleSchemaPath,
}: {
  drizzleKitConfigPath: string | undefined;
  drizzleSchemaPath: string | undefined;
}) => {
  if (drizzleSchemaPath) {
    const fullPath = path.resolve(process.cwd(), drizzleSchemaPath);

    try {
      await fs.access(fullPath);

      return fullPath;
    } catch (error) {
      console.error(
        `❌ drizzle-zero: could not find Drizzle schema file at ${fullPath}`,
      );
      process.exit(1);
    }
  }

  if (drizzleKitConfigPath) {
    const fullPath = path.resolve(process.cwd(), drizzleKitConfigPath);

    try {
      await fs.access(fullPath);

      const drizzleKitConfigImport = await tsImport(fullPath, __filename);

      const drizzleKitConfig = drizzleKitConfigImport?.default as Config;

      try {
        if (Array.isArray(drizzleKitConfig.schema)) {
          throw new Error(
            "❌ drizzle-zero: Drizzle Kit config schema is an array. Please specify a single schema file for imports to be able to work correctly.",
          );
        }

        if (drizzleKitConfig.schema) {
          const fullPath = path.resolve(process.cwd(), drizzleKitConfig.schema);

          await fs.access(fullPath);

          return fullPath;
        }
      } catch (error) {
        console.error(
          `❌ drizzle-zero: could not find Drizzle file pulled from Drizzle Kit config at ${drizzleKitConfig}`,
        );
        process.exit(1);
      }

      return fullPath;
    } catch (error) {
      console.error(
        `❌ drizzle-zero: could not find Drizzle Kit config file at ${drizzleKitConfigPath}`,
      );
      process.exit(1);
    }
  }

  console.error(
    `❌ drizzle-zero: could not find Drizzle Kit config file at ${drizzleKitConfigPath}`,
  );
  process.exit(1);
};

export async function getDrizzleSchemaSourceFile({
  tsProject,
  drizzleSchemaPath,
}: {
  tsProject: Project;
  drizzleSchemaPath: string;
}) {
  const sourceFile = tsProject.getSourceFile(drizzleSchemaPath);

  if (!sourceFile) {
    throw new Error(
      `❌ drizzle-zero: Failed to find type definitions for ${drizzleSchemaPath}`,
    );
  }

  return sourceFile;
}
