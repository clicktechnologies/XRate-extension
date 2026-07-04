import { mkdir, rm, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const distDir = join(projectRoot, "dist");

const staticFiles = [
  ["extension/manifest.json", "manifest.json"],
  ["extension/popup.html", "popup.html"],
  ["extension/_locales/en/messages.json", "_locales/en/messages.json"],
  ["extension/_locales/ru/messages.json", "_locales/ru/messages.json"],
  ["src/popup/popup.css", "popup.css"],
  ["extension/icons/icon-16.png", "icons/icon-16.png"],
  ["extension/icons/icon-32.png", "icons/icon-32.png"],
  ["extension/icons/icon-48.png", "icons/icon-48.png"],
  ["extension/icons/icon-128.png", "icons/icon-128.png"]
];

const entryPoints = [
  {
    entry: "src/background/worker.ts",
    outfile: "background/worker.js",
    format: "esm"
  },
  {
    entry: "src/content/selectionController.ts",
    outfile: "content/selectionController.js",
    format: "iife"
  },
  {
    entry: "src/popup/popup.ts",
    outfile: "popup.js",
    format: "iife"
  }
];

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const [source, target] of staticFiles) {
  const targetPath = join(distDir, target);
  await mkdir(dirname(targetPath), { recursive: true });
  await copyFile(join(projectRoot, source), targetPath);
}

for (const entryPoint of entryPoints) {
  await build({
    bundle: true,
    entryPoints: [join(projectRoot, entryPoint.entry)],
    format: entryPoint.format,
    logLevel: "info",
    outfile: join(distDir, entryPoint.outfile),
    platform: "browser",
    sourcemap: false,
    target: "chrome116"
  });
}
