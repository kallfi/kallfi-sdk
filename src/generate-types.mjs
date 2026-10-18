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
  if (schema.type === "null") return "null";
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
      `  ${quote(name)}${required.has(name) ? "" : "?"}: ${typeOf(value)};`,
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


function dereference(value) {
  if (!value?.$ref) return value;
  if (!value.$ref.startsWith("#/")) throw new Error("External OpenAPI references are not supported");
  return value.$ref.slice(2).split("/").reduce((node, key) => node?.[key.replace(/~1/g, "/").replace(/~0/g, "~")], contract);
}
const operations = {};
for (const [path, item] of Object.entries(contract.paths ?? {})) {
  for (const [method, operation] of Object.entries(item)) {
    if (!["get", "head", "post", "put", "patch", "delete"].includes(method) || !operation.operationId) continue;
    if (operations[operation.operationId]) throw new Error("Duplicate operationId");
    const parameters = new Map();
    for (const entry of [...(item.parameters ?? []), ...(operation.parameters ?? [])]) {
      const parameter = dereference(entry);
      if (!parameter?.name || !parameter.in) throw new Error("Invalid OpenAPI parameter");
      parameters.set(`${parameter.in}:${parameter.name}`, parameter);
    }
    const values = [...parameters.values()];
    const body = dereference(operation.requestBody);
    if (body && !body.content?.["application/json"]) throw new Error("Non-JSON operation requires a separately qualified capability");
    const scope = operation["x-kallfi-command-scope"];
    if (scope !== "workspace" && scope !== "account") throw new Error("Operation scope is required");
    operations[operation.operationId] = { method: method.toUpperCase(), path, scope,
      pathParameters: values.filter(value => value.in === "path").map(value => ({name:value.name,required:!!value.required})),
      queryParameters: values.filter(value => value.in === "query").map(value => ({name:value.name,required:!!value.required,array:dereference(value.schema)?.type === "array"})),
      bodyAllowed: !!body, bodyRequired: !!body?.required,
      idempotencyRequired: !["get", "head"].includes(method) };
  }
}
const operationsOutput = `// GENERATED FILE. Do not edit; run npm run generate.\n// OpenAPI snapshot SHA-256: ${contractHash}\nexport const KALLFI_OPERATIONS = ${JSON.stringify(operations, null, 2)} as const;\nexport type KallfiOperationId = keyof typeof KALLFI_OPERATIONS;\n`;
const outputs = [[outputPath, generated], [join(root,"src","operations.ts"), operationsOutput]];
if (process.argv.includes("--check")) {
  for (const [path, expected] of outputs) {
    if (await readFile(path, "utf8").catch(() => "") !== expected) {
      console.error("Generated API contract files are out of date. Run npm run generate."); process.exitCode = 1;
    }
  }
} else {
  for (const [path, value] of outputs) await writeFile(path, value);
  console.log(`Generated API types and ${Object.keys(operations).length} operations from OpenAPI (${contractHash}).`);
}
