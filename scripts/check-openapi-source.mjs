import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXPECTED_SHA256 =
  "2f70c5fa2db0b1d0015043e09eafbae494d4af4f02cfcbdfcf5a00c055d21b65";
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
