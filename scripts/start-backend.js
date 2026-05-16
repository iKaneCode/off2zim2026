const http = require("http");
const { mkdirSync, openSync } = require("fs");
const { join, resolve } = require("path");
const { spawn } = require("child_process");

const projectRoot = resolve(__dirname, "..");
const logDir = join(projectRoot, ".codex");
const outLog = join(logDir, "backend.log");
const errLog = join(logDir, "backend.err.log");
const port = process.env.PORT || "4000";

function checkHealth() {
  return new Promise((resolveHealth) => {
    const request = http.get(
      {
        host: "localhost",
        port,
        path: "/api/health",
        timeout: 2000,
      },
      (response) => {
        response.resume();
        resolveHealth(response.statusCode && response.statusCode < 500);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolveHealth(false);
    });

    request.on("error", () => resolveHealth(false));
  });
}

(async () => {
if (await checkHealth()) {
  console.log(`Backend is already running at http://localhost:${port}`);
  process.exit(0);
}

mkdirSync(logDir, { recursive: true });

const out = openSync(outLog, "a");
const err = openSync(errLog, "a");

const child = spawn(process.execPath, [join(projectRoot, "scripts", "run-backend.js")], {
  cwd: projectRoot,
  detached: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_FORCE_SURFACE: process.env.NEXT_PUBLIC_FORCE_SURFACE || "public",
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED || "1",
  },
  stdio: ["ignore", out, err],
  shell: false,
  windowsHide: true,
});

child.unref();

console.log(`Backend started with PID ${child.pid}`);
console.log(`Logs: ${outLog}`);
})();
