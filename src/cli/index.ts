import { Command } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import { Project } from "ts-morph";
import { getConfigFromFile } from "./config";
import { getDefaultConfig } from "./drizzle-kit";
import { getGeneratedSchema } from "./shared";

const defaultConfigFile = "./drizzle-zero.config.ts";
const defaultOutputFile = "./zero-schema.gen.ts";
const defaultTsConfigFile = "./tsconfig.json";
const defaultDrizzleKitConfigPath = "./drizzle.config.ts";

export async function loadPrettier() {
  try {
    return await import("prettier");
  } catch (_) {}

  try {
    const path = require.resolve("prettier", { paths: [process.cwd()] });
    return await import(pathToFileURL(path).href);
  } catch {
    throw new Error(
      "⚠️  drizzle-zero: prettier could not be found. Install it locally with\n  npm i -D prettier",
    );
  }
}

export async function formatSchema(schema: string): Promise<string> {
  try {
    const prettier = await loadPrettier();
    return prettier.format(schema, {
      parser: "typescript",
    });
  } catch (error) {
    console.warn("⚠️  drizzle-zero: prettier not found, skipping formatting");
    return schema;
  }
}

export interface GeneratorOptions {
  config?: string;
  tsConfigPath?: string;
  format?: boolean;
  outputFilePath?: string;
  drizzleSchemaPath?: string;
  drizzleKitConfigPath?: string;
}

async function main(opts: GeneratorOptions = {}) {
  const {
    config,
    tsConfigPath,
    format,
    outputFilePath,
    drizzleSchemaPath,
    drizzleKitConfigPath,
  } = { ...opts };

  const resolvedTsConfigPath = tsConfigPath ?? defaultTsConfigFile;
  const resolvedOutputFilePath = outputFilePath ?? defaultOutputFile;

  const configFilePath = config;

  if (!configFilePath) {
    console.log(
      "😶‍🌫️  drizzle-zero: Using all tables/columns from Drizzle schema",
    );
  }

  const tsProject = new Project({
    tsConfigFilePath: resolvedTsConfigPath,
  });

  const result = configFilePath
    ? await getConfigFromFile({
        configFilePath,
        tsProject,
      })
    : await getDefaultConfig({
        drizzleSchemaPath,
        drizzleKitConfigPath,
        tsProject,
      });

  if (!result?.zeroSchema) {
    console.error(
      "❌ drizzle-zero: No config found in the config file - did you export `default` or `schema`?",
    );
    process.exit(1);
  }

  let zeroSchemaGenerated = await getGeneratedSchema({
    tsProject,
    result,
    outputFilePath: resolvedOutputFilePath,
  });

  if (format) {
    zeroSchemaGenerated = await formatSchema(zeroSchemaGenerated);
  }

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
    )
    .option(
      "-d, --drizzle-schema <input-file>",
      `Path to the Drizzle schema file`,
    )
    .option(
      "-k, --drizzle-kit-config <input-file>",
      `Path to the Drizzle Kit config file`,
      defaultDrizzleKitConfigPath,
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
    .option("-f, --format", `Format the generated schema`, false)
    .action(async (command) => {
      console.log(
        `⚙️  drizzle-zero: Generating zero schema from ${command.config}...`,
      );

      const zeroSchema = await main({
        config: command.config,
        tsConfigPath: command.tsconfig,
        format: command.format,
        outputFilePath: command.output,
        drizzleSchemaPath: command.drizzleSchema,
        drizzleKitConfigPath: command.drizzleKitConfig,
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
        console.log("drizzle-zero: ", {
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
