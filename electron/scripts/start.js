// Starts Electron with this folder as the app root (package.json "main").
import { spawn } from "node:child_process";
import path from "node:path";
import electron from "electron";

// Some terminals set ELECTRON_RUN_AS_NODE, which makes Electron run as plain
// Node and never open a window.
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const child = spawn(
  electron,
  [path.resolve(import.meta.dirname, ".."), ...process.argv.slice(2)],
  { env: environment, stdio: "inherit" },
);

child.on("error", (error) => {
  console.error(`Unable to start Electron: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
