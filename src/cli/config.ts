import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Project } from "ts-morph";
import { tsImport } from "tsx/esm/api";
import type { DrizzleToZeroSchema } from "../relations";

export const getConfigFromFile = async ({
  configFilePath,
  tsProject,
}: {
  configFilePath: string;
  tsProject: Project;
}) => {
  const fullConfigPath = path.resolve(process.cwd(), configFilePath);

  try {
    await fs.access(fullConfigPath);
  } catch (error) {
    throw new Error(
      `❌ drizzle-zero: Failed to find config file at ${fullConfigPath}`,
    );
  }

  const zeroConfigImport = await tsImport(fullConfigPath, __filename);
  const exportName = zeroConfigImport?.default ? "default" : "schema";
  const zeroSchema = zeroConfigImport?.default ?? zeroConfigImport?.schema;

  const typeDeclarations = await getZeroSchemaDefsFromConfig({
    tsProject,
    configPath: fullConfigPath,
    exportName,
  });

  return {
    type: "config",
    zeroSchema: zeroSchema as DrizzleToZeroSchema<any> | undefined,
    exportName,
    zeroSchemaTypeDeclarations: typeDeclarations,
  } as const;
};

export async function getZeroSchemaDefsFromConfig({
  tsProject,
  configPath,
  exportName,
}: {
  tsProject: Project;
  configPath: string;
  exportName: string;
}) {
  const fileName = configPath.slice(configPath.lastIndexOf("/") + 1);

  const sourceFile = tsProject.getSourceFile(fileName);

  if (!sourceFile) {
    throw new Error(
      `❌ drizzle-zero: Failed to find type definitions for ${fileName}`,
    );
  }

  const exportDeclarations = sourceFile.getExportedDeclarations();

  for (const [name, declarations] of exportDeclarations.entries()) {
    for (const declaration of declarations) {
      if (exportName === name) {
        return [name, declaration] as const;
      }
    }
  }

  throw new Error(
    `❌ drizzle-zero: No config type found in the config file - did you export \`default\` or \`schema\`? Found: ${sourceFile
      .getVariableDeclarations()
      .map((v) => v.getName())
      .join(", ")}`,
  );
}
