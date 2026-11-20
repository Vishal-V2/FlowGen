const { spawnSync } = require("node:child_process");
const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const result = spawnSync(
  process.platform === "win32" ? "prisma.cmd" : "prisma",
  process.argv.slice(2),
  { stdio: "inherit", env: process.env }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
