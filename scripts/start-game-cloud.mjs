import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const sitekey = "0x4AAAAAAEx0vY9YtON8BHah";
const widget = spawnSync(process.execPath, [wrangler, "turnstile", "widget", "get", sitekey, "--json"], {
  encoding: "utf8",
  maxBuffer: 1024 * 1024,
});

if (widget.error || widget.status !== 0) {
  console.error("Could not load the Cloudflare preview verification key. Check Wrangler authentication.");
  process.exit(1);
}

let secret;
try {
  const details = JSON.parse(widget.stdout);
  if (details.sitekey !== sitekey || typeof details.secret !== "string" || !details.secret) throw Error();
  secret = details.secret;
} catch {
  console.error("Cloudflare returned an invalid preview verification key.");
  process.exit(1);
}

const server = spawn(process.execPath, [wrangler, "dev", "--config", "wrangler.game-cloud.jsonc", "--env-file", "scripts/game-cloud.env.example", "--port", "8790", "--ip", "127.0.0.1"], {
  stdio: "inherit",
  env: { ...process.env, GAME_TURNSTILE_SECRET: secret },
});

server.on("exit", (code) => { process.exitCode = code ?? 1; });
server.on("error", () => { console.error("Could not start the Cloudflare-backed game API."); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
