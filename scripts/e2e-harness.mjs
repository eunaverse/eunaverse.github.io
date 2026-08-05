import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractsPath = resolve(repositoryRoot, "tests/e2e/feature-contracts.json");
const outputRoot = resolve(repositoryRoot, "test-results");
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function runPlaywright(args, stdio = "inherit") {
  return spawnSync(npxCommand, ["playwright", "test", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, PLAYWRIGHT_HTML_OPEN: "never" },
    stdio,
  });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const registry = JSON.parse(readFileSync(contractsPath, "utf8"));
const contracts = registry.features ?? [];
const ids = contracts.map((contract) => contract.id);
const testTitles = contracts.map((contract) => contract.test);

if (contracts.length === 0) {
  console.error("No E2E feature contracts are registered.");
  process.exit(1);
}

if (new Set(ids).size !== ids.length || new Set(testTitles).size !== testTitles.length) {
  console.error("Feature contract IDs and test titles must be unique.");
  process.exit(1);
}

const listed = runPlaywright(["--list", "--project=chromium"], "pipe");
if (listed.status !== 0) {
  process.stdout.write(listed.stdout ?? "");
  process.stderr.write(listed.stderr ?? "");
  process.exit(listed.status ?? 1);
}

const discoveredTitles = [];
const testLine = /^\s*\[[^\]]+\]\s+›\s+.+?:\d+:\d+\s+›\s+(.+)$/gm;
for (const match of listed.stdout.matchAll(testLine)) {
  discoveredTitles.push(match[1].trim());
}

const undocumented = discoveredTitles.filter((title) => !testTitles.includes(title));
const missing = testTitles.filter((title) => !discoveredTitles.includes(title));

if (undocumented.length > 0 || missing.length > 0) {
  console.error("E2E feature contract registry is out of sync.");
  for (const title of undocumented) console.error(`  Undocumented test: ${title}`);
  for (const title of missing) console.error(`  Missing test: ${title}`);
  process.exit(1);
}

console.log(`Validated ${contracts.length} feature contracts. Running each independently.`);

const results = [];
for (const [index, contract] of contracts.entries()) {
  const label = `[${index + 1}/${contracts.length}] ${contract.id}`;
  console.log(`\n${label}: ${contract.test}`);

  const result = runPlaywright([
    "--project=chromium",
    "--workers=1",
    "--retries=0",
    "--reporter=line",
    `--output=test-results/${contract.id}`,
    "--grep",
    `${escapeRegex(contract.test)}$`,
  ]);

  const passed = result.status === 0;
  results.push({ id: contract.id, test: contract.test, passed });
  console.log(`${label}: ${passed ? "PASS" : "FAIL"}`);
}

mkdirSync(outputRoot, { recursive: true });
writeFileSync(
  resolve(outputRoot, "e2e-harness-summary.json"),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
);

const failed = results.filter((result) => !result.passed);
console.log(`\nE2E harness summary: ${results.length - failed.length} passed, ${failed.length} failed.`);

if (failed.length > 0) {
  for (const result of failed) console.error(`  Failed: ${result.id}`);
  process.exit(1);
}
