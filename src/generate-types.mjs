import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const contractPath = join(root, "openapi", "openapi.v1.json");
const outputPath = join(root, "src", "generated.ts");
const contract = JSON.parse(await readFile(contractPath, "utf8"));
const schemas = contract.components?.schemas ?? {};

const quote = (value) => JSON.stringify(value);
const refName = (ref) => ref.split("/").pop();

function typeOf(schema) {
  if (!schema) return "unknown";
  if (schema.$ref) return refName(schema.$ref);
  if (schema.const !== undefined) return quote(schema.const);
  if (schema.enum) return schema.enum.map(quote).join(" | ");
  if (schema.type === "array") return `ReadonlyArray<${typeOf(schema.items)}>`;
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "string") return "string";
  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const fields = Object.entries(properties).map(([name, value]) =>
      `  ${name}${required.has(name) ? "" : "?"}: ${typeOf(value)};`,
    );
    if (schema.additionalProperties) {
      const value = schema.additionalProperties === true ? "unknown" : typeOf(schema.additionalProperties);
      fields.push(`  [key: string]: ${value};`);
    }
    return fields.length ? `{\n${fields.join("\n")}\n}` : "Record<string, unknown>";
  }
  if (schema.oneOf) return schema.oneOf.map(typeOf).join(" | ");
  if (schema.anyOf) return schema.anyOf.map(typeOf).join(" | ");
  if (schema.allOf) return schema.allOf.map(typeOf).join(" & ");
  return "unknown";
}

const contractHash = createHash("sha256").update(await readFile(contractPath)).digest("hex");
const lines = [
  "/* eslint-disable */",
  "// GENERATED FILE. Do not edit by hand; run `npm run generate`.",
  `// OpenAPI snapshot SHA-256: ${contractHash}`,
  "",
];
for (const [name, schema] of Object.entries(schemas)) {
  const value = typeOf(schema);
  if (value.startsWith("{\n")) {
    lines.push(`export interface ${name} ${value}`);
  } else {
    lines.push(`export type ${name} = ${value};`);
  }
  lines.push("");
}
const generated = `${lines.join("\n").trimEnd()}\n`;

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("Generated API types are out of date. Run `npm run generate`.");
    process.exitCode = 1;
  } else {
    console.log("Generated API types are up to date.");
  }
} else {
  await writeFile(outputPath, generated);
  console.log(`Generated ${outputPath} from OpenAPI (${contractHash}).`);
}
