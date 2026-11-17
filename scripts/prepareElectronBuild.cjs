const fs = require("fs");
const path = require("path");

const buildDir = path.resolve(process.cwd(), ".electron-build");
const packageJsonPath = path.join(buildDir, "package.json");

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.writeFileSync(
  packageJsonPath,
  JSON.stringify(
    {
      name: "pawnsystemsub-electron-build",
      private: true,
      main: "electron/src/main/index.js",
      type: "commonjs",
    },
    null,
    2,
  ) + "\n",
);
