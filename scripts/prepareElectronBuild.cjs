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
const seedDir = path.join(buildDir, "database", "seed");
fs.mkdirSync(seedDir, { recursive: true });
fs.copyFileSync(
  path.resolve(process.cwd(), "database/seed/canadacities.csv"),
  path.join(seedDir, "canadacities.csv"),
);

// Database initialization reads the same validated JSON mapping as the importer.
for (const relativePath of [
  "database/migration/scripts/id-type-mapping.cjs",
  "database/migration/mappings/id-type-mapping.json",
]) {
  const target = path.join(buildDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.resolve(process.cwd(), relativePath), target);
}
