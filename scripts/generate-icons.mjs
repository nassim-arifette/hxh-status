import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const publicDir = join(process.cwd(), "public");

// SVG definitions
const bg = "#111512";
const hColor = "#F3F6F3";
const xColor = "#78C963";

// Paths from favicon.svg (viewBox 0 0 64 64)
// H path: M13 17h7v12h10V17h7v30h-7V35H20v12h-7V17Z
// x path: m41 25 4 5 4-5 4 4-5 4 5 5-4 4-4-5-4 5-4-4 5-5-5-4 4-4Z

function createSvg(size, glyphScale = 1, rounded = false) {
  // Center is at 32, 32 in 64x64 box
  // With glyphScale, we transform around center (32, 32)
  const transform = glyphScale !== 1
    ? `transform="translate(32, 32) scale(${glyphScale}) translate(-32, -32)"`
    : "";
  const rx = rounded ? 'rx="14"' : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
      <rect width="64" height="64" ${rx} fill="${bg}"/>
      <g ${transform}>
        <path d="M13 17h7v12h10V17h7v30h-7V35H20v12h-7V17Z" fill="${hColor}"/>
        <path d="m41 25 4 5 4-5 4 4-5 4 5 5-4 4-4-5-4 5-4-4 5-5-5-4 4-4Z" fill="${xColor}"/>
      </g>
    </svg>
  `;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const targets = [
    {
      file: "apple-touch-icon.png",
      size: 180,
      svg: createSvg(180, 0.85, false), // Apple masks rounded corners, scale slightly for nice margins
    },
    {
      file: "icon-192.png",
      size: 192,
      svg: createSvg(192, 0.9, false),
    },
    {
      file: "icon-512.png",
      size: 512,
      svg: createSvg(512, 0.9, false),
    },
    {
      file: "icon-maskable-512.png",
      size: 512,
      svg: createSvg(512, 0.75, false), // 75% scale well inside 80% safe zone
    },
  ];

  for (const { file, size, svg } of targets) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
            svg { display: block; width: ${size}px; height: ${size}px; }
          </style>
        </head>
        <body>
          ${svg}
        </body>
      </html>
    `);

    const buffer = await page.screenshot({ type: "png", omitBackground: false });
    const outPath = join(publicDir, file);
    await writeFile(outPath, buffer);
    console.log(`Generated ${file} (${size}x${size})`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
