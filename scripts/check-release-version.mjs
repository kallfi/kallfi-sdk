import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const pyproject = await readFile(
  new URL("../python/pyproject.toml", import.meta.url),
  "utf8",
);
const pythonVersion = pyproject.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

if (!pythonVersion) {
  throw new Error("Could not read Python project.version from python/pyproject.toml");
}

if (packageJson.version !== pythonVersion) {
  throw new Error(
    `SDK versions differ: JavaScript=${packageJson.version}, Python=${pythonVersion}`,
  );
}

if (process.env.GITHUB_REF_TYPE === "tag") {
  const expectedTag = `v${packageJson.version}`;
  if (process.env.GITHUB_REF_NAME !== expectedTag) {
    throw new Error(
      `Release tag ${process.env.GITHUB_REF_NAME} does not match ${expectedTag}`,
    );
  }
}

console.log(`SDK release versions agree (${packageJson.version}).`);
