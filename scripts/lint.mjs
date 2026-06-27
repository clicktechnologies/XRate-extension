import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const checkedDirectories = ["src", "test", "scripts"];
const bannedModuleNames = new Set(["utils", "helpers", "common", "misc", "lib", "tools"]);
const sourceExtensions = new Set([".ts", ".mjs"]);
const taskMarkerPattern = new RegExp(["TO", "DO", "|FIX", "ME|HA", "CK"].join(""));
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".tmp-test") {
        continue;
      }

      if (bannedModuleNames.has(entry.name)) {
        failures.push(`${relative(projectRoot, path)} uses a banned module directory name`);
      }

      await walk(path);
      continue;
    }

    if (!entry.isFile() || !sourceExtensions.has(extname(entry.name))) {
      continue;
    }

    await checkFile(path);
  }
}

async function checkFile(path) {
  const content = await readFile(path, "utf8");
  const relativePath = relative(projectRoot, path);
  const extension = extname(path);

  if (extension === ".ts" && /\bany\b/.test(content)) {
    failures.push(`${relativePath} contains the banned TypeScript escape hatch "any"`);
  }

  if (extension === ".ts" && /\sas\s/.test(content)) {
    failures.push(`${relativePath} contains the banned TypeScript assertion keyword "as"`);
  }

  if (taskMarkerPattern.test(content)) {
    failures.push(`${relativePath} contains a banned task marker`);
  }
}

for (const directory of checkedDirectories) {
  await walk(join(projectRoot, directory));
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
