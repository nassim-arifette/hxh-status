import { createServer } from "node:http";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";

import { chromium } from "playwright";

const outDirectory = join(process.cwd(), "out");

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const captures = [
  {
    pathname: "/capture/production",
    selector: "#production-share-capture",
    output: join(outDirectory, "share", "production.png"),
    publicOutput: join(process.cwd(), "public", "share", "production.png"),
  },
  {
    pathname: "/capture/publication-history",
    selector: "#publication-history-share-capture",
    output: join(outDirectory, "share", "publication-history.png"),
    publicOutput: join(
      process.cwd(),
      "public",
      "share",
      "publication-history.png",
    ),
  },
];

async function findFile(pathname) {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const safePath = normalize(relativePath);

  if (safePath.startsWith("..")) return null;

  const basePath = join(outDirectory, safePath);
  const candidates = [
    basePath,
    `${basePath}.html`,
    join(basePath, "index.html"),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next static-export path shape.
    }
  }

  return null;
}

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const filePath = await findFile(requestUrl.pathname);

    if (!filePath) {
      response.writeHead(404).end("Not found");
      return;
    }

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
    });
    response.end(await readFile(filePath));
  } catch (error) {
    response.writeHead(500).end(error instanceof Error ? error.message : "Error");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

const address = server.address();

if (!address || typeof address === "string") {
  server.close();
  throw new Error("The local capture server did not expose a TCP port.");
}

const origin = `http://127.0.0.1:${address.port}`;
let browser;

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    viewport: { width: 1160, height: 1200 },
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  for (const capture of captures) {
    await page.goto(`${origin}${capture.pathname}`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);

    const target = page.locator(capture.selector);
    await target.waitFor({ state: "visible" });
    await Promise.all([
      mkdir(dirname(capture.output), { recursive: true }),
      mkdir(dirname(capture.publicOutput), { recursive: true }),
    ]);
    await target.screenshot({
      animations: "disabled",
      caret: "hide",
      path: capture.output,
      scale: "css",
    });
    await copyFile(capture.output, capture.publicOutput);

    const bounds = await target.boundingBox();
    const dimensions = bounds
      ? `${Math.round(bounds.width)}x${Math.round(bounds.height)}`
      : "unknown size";
    console.log(`Generated ${capture.output} (${dimensions}).`);
  }

  if (pageErrors.length > 0) {
    throw new Error(`Capture pages reported errors:\n${pageErrors.join("\n")}`);
  }

  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
