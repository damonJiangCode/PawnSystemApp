const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.execPath,
  [
    "--loader",
    "ts-node/esm",
    "--test",
    "frontend/src/**/*.test.ts",
    "electron/src/**/*.test.ts",
    "shared/**/*.test.ts",
    "scripts/*.test.cjs",
    "database/migration/scripts/*.test.cjs",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: "true",
    },
  },
);

process.exit(result.status ?? 1);
