import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Project, type ts, type Type, VariableDeclarationKind } from "ts-morph";
import { tsImport } from "tsx/esm/api";

const defaultConfigFile = "drizzle-zero.config.ts";
const defaultOutputFile = "zero-schema.gen.ts";

async function findConfigFile() {
  const files = await fs.readdir(process.cwd());

  const configFile = files.find((file) => file.endsWith(defaultConfigFile));
  if (!configFile) {
    console.error("❌  drizzle-zero: No configuration file found");
    process.exit(1);
  }

  return configFile;
}

async function createTempDir() {
  // Create a temp directory in the current directory
  const cwdTempDir = path.join(process.cwd(), ".drizzle-zero-temp");
  await fs.mkdir(cwdTempDir, { recursive: true });
  return await fs.mkdtemp(path.join(cwdTempDir, "drizzle-zero-"));
}

async function removeTempDir(tempDir: string) {
  try {
    // Remove the temp directory and its contents
    await fs.rm(tempDir, { recursive: true, force: true });

    // Also try to remove the parent .drizzle-zero-temp directory if it exists and is empty
    const parentDir = path.join(process.cwd(), ".drizzle-zero-temp");

    try {
      const contents = await fs.readdir(parentDir);
      if (contents.length === 0) {
        await fs.rmdir(parentDir);
      }
    } catch (parentDirError) {
      // Ignore errors when trying to remove the parent directory
    }
  } catch (error) {
    console.warn(
      `⚠️  drizzle-zero: Failed to clean up temporary directory ${tempDir}`,
      error,
    );
  }
}

async function getZeroSchemaDefsFromConfig(
  configPath: string,
): Promise<string> {
  const tempOutDir = await createTempDir();
  try {
    const drizzleZeroConfigProject = new Project({
      compilerOptions: {
        declaration: true,
        emitDeclarationOnly: true,
        outDir: tempOutDir,
        rootDir: "./",
      },
    });

    const configFile = drizzleZeroConfigProject.addSourceFileAtPath(configPath);
    await configFile.emit();

    const zeroSchemaTypeDefs = await fs.readFile(
      path.resolve(
        tempOutDir,
        path.relative(process.cwd(), configPath).replace(".ts", ".d.ts"),
      ),
      "utf-8",
    );

    if (!zeroSchemaTypeDefs) {
      throw new Error(
        `drizzle-zero: Failed to generate type definitions from ${configPath}`,
      );
    }

    return zeroSchemaTypeDefs;
  } finally {
    // Clean up the temporary directory
    await removeTempDir(tempOutDir);
  }
}

function getZeroSchemaTypeFromDefs(typeDefsFile: string) {
  const zeroSchemaTypeGetter = new Project({ useInMemoryFileSystem: true });
  const zeroSchemaTypeDeclaration = zeroSchemaTypeGetter.createSourceFile(
    "zero-schema.d.ts",
    typeDefsFile,
  );
  const zeroSchemaTypeDecl =
    zeroSchemaTypeDeclaration.getVariableDeclarationOrThrow("_default");
  const zeroSchemaType = zeroSchemaTypeDecl.getType();

  return zeroSchemaType;
}

async function getGeneratedSchema(
  zeroSchema: unknown,
  zeroSchemaType: Type<ts.Type>,
) {
  const typename = "Schema";

  const drizzleZeroOutputProject = new Project({ useInMemoryFileSystem: true });
  const zeroSchemaGenerated = drizzleZeroOutputProject.createSourceFile(
    defaultOutputFile,
    "",
    {
      overwrite: true,
    },
  );

  zeroSchemaGenerated.addTypeAlias({
    name: typename,
    isExported: true,
    type: zeroSchemaType.getText(),
  });

  zeroSchemaGenerated.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "schema",
        initializer: `${JSON.stringify(zeroSchema, null, 2)} as unknown as ${typename}`,
      },
    ],
  });

  await zeroSchemaGenerated.save();
  const file = await drizzleZeroOutputProject
    .getFileSystem()
    .readFile(defaultOutputFile, "utf-8");

  return `
/* eslint-disable */
/* tslint:disable */
/* noinspection JSUnusedGlobalSymbols */
/* @ts-nocheck */
/*
 * ------------------------------------------------------------
 * ## This file was automatically generated by drizzle-zero  ##
 * ## Any changes you make to this file will be overwritten. ##
 * ##                                                        ##
 * ## Additionally, you should also exclude this file from   ##
 * ## your linter and/or formatter to prevent it from being  ##
 * ## checked or modified.                                   ##
 * ##                                                        ##
 * ## SOURCE: https://github.com/BriefHQ/drizzle-zero        ##
 * ------------------------------------------------------------
 */

${file}`;
}

export interface GeneratorOptions {
  config?: string;
  format?: boolean;
}

async function main(opts: GeneratorOptions = {}) {
  const { config, format } = { ...opts };

  const configFilePath = config ?? (await findConfigFile());

  const fullConfigPath = path.resolve(process.cwd(), configFilePath);

  try {
    await fs.access(fullConfigPath);
  } catch (error) {
    console.error(
      `❌ drizzle-zero: config file not found at ${fullConfigPath}`,
    );
    process.exit(1);
  }

  const { default: zeroConfig } = await tsImport(fullConfigPath, __filename);

  const zeroSchemaDefs = await getZeroSchemaDefsFromConfig(fullConfigPath);
  const zeroSchemaType = getZeroSchemaTypeFromDefs(zeroSchemaDefs);

  const zeroSchemaGenerated = await getGeneratedSchema(
    zeroConfig,
    zeroSchemaType,
  );

  const zeroSchemaFormatted = format
    ? await (async () => {
        try {
          const { default: prettier } = await import("prettier");

          const formatted = await prettier.format(zeroSchemaGenerated, {
            parser: "typescript",
          });

          return formatted;
        } catch (error) {
          console.error(
            "⚠️  drizzle-zero: error formatting Zero schema with prettier - did you install it?",
            error,
          );
          return zeroSchemaGenerated;
        }
      })()
    : zeroSchemaGenerated;

  return zeroSchemaFormatted;
}

async function cli() {
  const program = new Command();
  program
    .name("drizzle-zero")
    .description("The CLI for converting Drizzle ORM schemas to Zero schemas");

  program
    .command("generate")
    .option(
      "-c, --config <input-file>",
      `Path to the ${defaultConfigFile} configuration file`,
      defaultConfigFile,
    )
    .option(
      "-o, --output <output-file>",
      `Path to the generated output file`,
      defaultOutputFile,
    )
    .option("-f, --format", "Format the output using prettier", false)
    .action(async (command) => {
      console.log(`⚙️  Generating zero schema from ${command.config}...`);

      const zeroSchema = await main({
        config: command.config,
        format: command.format,
      });

      if (command.output) {
        await fs.writeFile(
          path.resolve(process.cwd(), command.output),
          zeroSchema,
        );
        console.log(
          `✅ drizzle-zero: Zero schema written to ${command.output}`,
        );
      } else {
        console.log({
          schema: zeroSchema,
        });
      }
    });

  program.parse();
}

// Run the main function
cli().catch((error) => {
  console.error("❌ drizzle-zero error:", error);
  process.exit(1);
});
