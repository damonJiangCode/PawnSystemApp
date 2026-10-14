const { spawn } = require("node:child_process");
const path = require("node:path");

const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;

const child = spawn(
  require("electron"),
  [path.resolve(__dirname, "../.electron-build"), ...process.argv.slice(2)],
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
