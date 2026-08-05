import { spawnSync } from "node:child_process";

if (process.env.CI) {
  process.exit(0);
}

const insideWorktree = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
  encoding: "utf8",
});

if (insideWorktree.status !== 0 || insideWorktree.stdout.trim() !== "true") {
  console.warn("Skipping Git hook setup because this is not a Git worktree.");
  process.exit(0);
}

const configured = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit",
});

if (configured.status !== 0) {
  console.error("Unable to configure the repository Git hooks path.");
  process.exit(configured.status ?? 1);
}

console.log("Configured .githooks/pre-push for the required E2E gate.");
