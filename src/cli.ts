import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  IndentationText,
  Project,
  type ts,
  type Type,
  TypeFormatFlags,
  VariableDeclarationKind,
} from "ts-morph";
import { tsImport } from "tsx/esm/api";

const defaultConfigFile = "drizzle-zero.config.ts";
const defaultOutputFile = "zero-schema.gen.ts";
const defaultTsConfigFile = "tsconfig.json";

async function findConfigFile() {
  const files = await fs.readdir(process.cwd());

  const configFile = files.find((file) => file.endsWith(defaultConfigFile));
  if (!configFile) {
    console.error("❌  drizzle-zero: No configuration file found");
    process.exit(1);
  }

  return configFile;
}

async function getZeroSchemaDefsFromConfig({
  configPath,
  tsConfigPath,
}: {
  configPath: string;
  tsConfigPath: string;
}) {
  const drizzleZeroConfigProject = new Project({
    tsConfigFilePath: tsConfigPath,
    compilerOptions: {
      emitDeclarationOnly: true,
      declaration: true,
      noEmit: false,
      declarationMap: false,
      sourceMap: false,
    },
  });

  const fileName = configPath.slice(configPath.lastIndexOf("/") + 1);
  const resolvedOutputFileName = fileName.replace(".ts", ".d.ts");

  const emittedFiles = await drizzleZeroConfigProject.emitToMemory();

  // load into a new project to format
  const formatProject = new Project({
    useInMemoryFileSystem: true,
  });
  for (const file of emittedFiles.getFiles()) {
    formatProject.createSourceFile(file.filePath, file.text, {
      overwrite: true,
    });
  }

  // format the config file
  const sourceFile = formatProject.getSourceFile(resolvedOutputFileName);

  if (!sourceFile) {
    throw new Error(
      `❌  drizzle-zero: Failed to find type definitions for ${resolvedOutputFileName}`,
    );
  }

  const zeroSchemaTypeDecl =
    sourceFile.getVariableDeclarationOrThrow("_default");
  const zeroSchemaType = zeroSchemaTypeDecl.getType();

  return zeroSchemaType;
}

async function getGeneratedSchema(
  zeroSchema: unknown,
  zeroSchemaType: Type<ts.Type>,
) {
  const typename = "Schema";

  const drizzleZeroOutputProject = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  const zeroSchemaGenerated = drizzleZeroOutputProject.createSourceFile(
    defaultOutputFile,
    "",
    { overwrite: true },
  );

  zeroSchemaGenerated.addTypeAlias({
    name: typename,
    isExported: true,
    type: zeroSchemaType.getText(undefined, TypeFormatFlags.NoTruncation),
  });

  const stringifiedSchema = JSON.stringify(zeroSchema, null, 2).replaceAll(
    `"customType": null`,
    `"customType": null as unknown`,
  );

  zeroSchemaGenerated.addVariableStatement({
    declarationKind: VariableDeclarationKind.Const,
    isExported: true,
    declarations: [
      {
        name: "schema",
        initializer: `${stringifiedSchema} as ${typename}`,
      },
    ],
  });

  zeroSchemaGenerated.formatText();

  const file = zeroSchemaGenerated.getText();

  return `/* eslint-disable */
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
  tsConfigPath?: string;
}

async function main(opts: GeneratorOptions = {}) {
  const { config, tsConfigPath } = { ...opts };

  const configFilePath = config ?? (await findConfigFile());
  const resolvedTsConfigPath = tsConfigPath ?? defaultTsConfigFile;

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

  const zeroSchemaType = await getZeroSchemaDefsFromConfig({
    configPath: fullConfigPath,
    tsConfigPath: resolvedTsConfigPath,
  });

  const zeroSchemaGenerated = await getGeneratedSchema(
    zeroConfig,
    zeroSchemaType,
  );

  return zeroSchemaGenerated;
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
    .option(
      "-t, --tsconfig <tsconfig-file>",
      `Path to the custom tsconfig file`,
      defaultTsConfigFile,
    )
    .action(async (command) => {
      console.log(`⚙️  Generating zero schema from ${command.config}...`);

      const zeroSchema = await main({
        config: command.config,
        tsConfigPath: command.tsconfig,
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
