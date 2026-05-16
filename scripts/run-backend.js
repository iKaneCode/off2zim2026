const { existsSync } = require("fs");
const { dirname, join, resolve } = require("path");
const { spawn } = require("child_process");

const projectRoot = resolve(__dirname, "..");
const nextBin = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const port = process.env.PORT || "4000";

if (!existsSync(nextBin)) {
  console.error("Next.js is not installed in node_modules.");
  console.error("Install dependencies from the project root, then run this again.");
  console.error("Suggested command: npm install");
  process.exit(1);
}

process.env.NEXT_PUBLIC_FORCE_SURFACE = process.env.NEXT_PUBLIC_FORCE_SURFACE || "public";

process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED || "1";

const child = spawn(process.execPath, [nextBin, "dev", "-p", port, "--webpack"], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
  shell: false,
  windowsHide: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
