import { readFile } from "node:fs/promises";
import { deploymentContainsVerdict } from "../automation/deployment-verification.mjs";

const verdict = JSON.parse(await readFile(process.env.AUTOMATION_VERDICT_FILE, "utf8"));
const deadline = Date.now() + 12 * 60_000;
const origin = "https://hxhstatus.com";
while (Date.now() < deadline) {
  try {
    const read = async (path) => {
      const response = await fetch(`${origin}${path}?revision=${encodeURIComponent(verdict.revision)}`, {
        cache: "no-store", signal: AbortSignal.timeout(15_000),
        headers: { "Cache-Control": "no-cache" },
      });
      if (!response.ok) throw new Error(`Deployment returned ${response.status}.`);
      return response.json();
    };
    const [status, feed] = await Promise.all([
      read("/status.json"),
      verdict.posts?.length ? read("/api/v1/togashi/posts.json") : null,
    ]);
    if (deploymentContainsVerdict(status, feed, verdict)) {
      console.log("Public tracker contains the committed update.");
      process.exit(0);
    }
  } catch {
    // A deployment can briefly return an older export or a gateway error.
  }
  await new Promise((resolve) => setTimeout(resolve, 20_000));
}
throw new Error("Public tracker has not deployed the expected update; notification withheld.");
