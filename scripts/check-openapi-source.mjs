import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const EXPECTED_SHA256 =
  "742fe946d29ef7e286eead3c8cea50a8a344793b2136f843655f896daea1d99b";
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
