import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "src", "app", "api");
const apiBak = path.join(root, "src", "app", "_api.bak");
const mw = path.join(root, "src", "middleware.ts");
const mwBak = path.join(root, "src", "middleware.ts.bak");

function renameSafe(from, to) {
  if (fs.existsSync(from)) fs.renameSync(from, to);
}

try {
  renameSafe(apiDir, apiBak);
  renameSafe(mw, mwBak);
  const env = {
    ...process.env,
    FIREBASE_STATIC: "1",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://tradeflow-ai-b9020.web.app",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "https://tradeflow-ai.fly.dev",
  };
  const r = spawnSync("npm", ["run", "build"], { cwd: root, env, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
} finally {
  renameSafe(apiBak, apiDir);
  renameSafe(mwBak, mw);
}
