const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const templatePath = path.join(root, ".env.example");

if (fs.existsSync(envPath)) {
  console.error(".env already exists; leaving it unchanged.");
  process.exit(1);
}

const template = fs.readFileSync(templatePath, "utf8");
const password = crypto.randomBytes(24).toString("hex");
const encryptionKey = crypto.randomBytes(32).toString("hex");

const env = template
  .replaceAll("replace-with-a-local-password", password)
  .replace("replace-with-64-hex-characters", encryptionKey)
  .replace(/^DATABASE_URL=.*/m, (line) =>
    line.replace("replace-with-a-local-password", password)
  )
  .replace(/^CLERK_SECRET_KEY=.*/m, "CLERK_SECRET_KEY=")
  .replace(/^CLERK_PUBLISHABLE_KEY=.*/m, "CLERK_PUBLISHABLE_KEY=")
  .replace(/^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=.*/m, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=");

fs.writeFileSync(envPath, env, { mode: 0o600, flag: "wx" });
console.log("Created .env with fresh local database and encryption credentials.");
console.log("Add your Clerk secret and publishable keys to .env before using authenticated features.");
