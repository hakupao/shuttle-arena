import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_NAME = "shuttle-arena-demo";
const DEPLOY_BRANCH = process.env.DEMO_DEPLOY_BRANCH || "master";
const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, ".vercel", "output", "static");

if (!existsSync(outputDir)) {
  console.error("Missing Cloudflare Pages build output:", outputDir);
  console.error("Run `npm run build:cf` before deploying the demo.");
  process.exit(1);
}

// `wrangler pages download config` can emit an empty `[env.<name>.placement]`
// table (no `mode`), which wrangler then rejects with
// '"placement.mode" is a required field'. Drop such empty tables so the env
// inherits the top-level placement setting.
function stripEmptyPlacementTables(configPath) {
  const lines = readFileSync(configPath, "utf8").split("\n");
  const isHeader = (line) => /^\s*\[/.test(line);
  const isBlank = (line) => /^\s*(#.*)?$/.test(line);
  const kept = lines.filter((line, i) => {
    if (!/^\s*\[env\.[^\]]+\.placement\]\s*$/.test(line)) return true;
    const next = lines.slice(i + 1).find((l) => !isBlank(l));
    return next !== undefined && !isHeader(next);
  });
  if (kept.length !== lines.length) {
    writeFileSync(configPath, kept.join("\n"));
    console.log("Removed empty placement table(s) from downloaded wrangler.toml");
  }
}

function run(args, cwd) {
  const result = spawnSync(npxBin, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const tempDir = mkdtempSync(path.join(os.tmpdir(), `${PROJECT_NAME}-`));

try {
  // Reuse the saved project config so demo bindings and vars stay consistent.
  run(["wrangler", "pages", "download", "config", PROJECT_NAME, "--force"], tempDir);
  stripEmptyPlacementTables(path.join(tempDir, "wrangler.toml"));
  run(
    [
      "wrangler",
      "pages",
      "deploy",
      outputDir,
      "--project-name",
      PROJECT_NAME,
      "--branch",
      DEPLOY_BRANCH,
    ],
    tempDir
  );
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
