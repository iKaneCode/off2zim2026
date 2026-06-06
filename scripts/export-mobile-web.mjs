import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobileDir = path.join(rootDir, "Mobile");
const exportDir = path.join(rootDir, ".data", "mobile-web-export");
const publicDir = path.join(rootDir, "public");
const manifestPath = path.join(publicDir, ".mobile-web-manifest.json");

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? "npm.cmd" : "npm";
const expoCommand = path.join(
  mobileDir,
  "node_modules",
  ".bin",
  isWindows ? "expo.cmd" : "expo",
);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: "inherit",
      shell: isWindows,
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(`${command} ${args.join(" ")} failed with exit code ${code}`),
      );
    });
  });
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(absolute, base)));
      continue;
    }

    if (entry.isFile()) {
      files.push(path.relative(base, absolute).replaceAll(path.sep, "/"));
    }
  }

  return files;
}

async function readPreviousManifest() {
  if (!(await pathExists(manifestPath))) {
    return [];
  }

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    return Array.isArray(manifest.files) ? manifest.files : [];
  } catch {
    return [];
  }
}

async function removePreviousExport() {
  const previousFiles = await readPreviousManifest();

  await Promise.all(
    previousFiles.map((relativePath) =>
      rm(path.join(publicDir, relativePath), { force: true }),
    ),
  );

  await Promise.all(
    ["_expo", "assets", "(tabs)", "admin", "provider", "screens"].map(
      (directory) =>
        rm(path.join(publicDir, directory), { recursive: true, force: true }),
    ),
  );
}

async function copyExportToPublic() {
  const files = await listFiles(exportDir);

  for (const relativePath of files) {
    const source = path.join(exportDir, relativePath);
    const destination = path.join(publicDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  await writeFile(
    manifestPath,
    JSON.stringify(
      {
        generatedBy: "scripts/export-mobile-web.mjs",
        files,
      },
      null,
      2,
    ),
  );
}

async function main() {
  if (!existsSync(expoCommand)) {
    await run(npmCommand, ["ci", "--legacy-peer-deps"], { cwd: mobileDir });
  }

  await rm(exportDir, { recursive: true, force: true });
  await mkdir(exportDir, { recursive: true });

  await run(expoCommand, [
    "export",
    "--platform",
    "web",
    "--output-dir",
    exportDir,
  ], {
    cwd: mobileDir,
    env: {
      ...process.env,
      EXPO_PUBLIC_APP_VARIANT: "explorer",
      BROWSERSLIST_IGNORE_OLD_DATA: "1",
    },
  });

  await removePreviousExport();
  await copyExportToPublic();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
