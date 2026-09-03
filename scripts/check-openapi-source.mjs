import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXPECTED_SHA256 =
  "904b0d63060add46c55e1297255eec29b08e3733eac57d9157d4202f9823a9f2";
const contractUrl = new URL("../openapi/openapi.v1.json", import.meta.url);
const contract = await readFile(contractUrl);
const actual = createHash("sha256").update(contract).digest("hex");

if (actual !== EXPECTED_SHA256) {
  console.error(
    `OpenAPI snapshot checksum mismatch. Expected ${EXPECTED_SHA256}, received ${actual}.`,
  );
  console.error(
    "Copy the canonical contract intentionally, regenerate both SDKs, and update the recorded checksum in one reviewable change.",
  );
  process.exitCode = 1;
} else {
  console.log(`OpenAPI snapshot verified (${actual}).`);
}
