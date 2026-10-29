const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const PRIVATE_PATHS = [
  ".env",
  "database/migration/source/check.txt",
  "database/migration/exports/check.txt",
  "database/migration/reports/check.txt",
  "database/migration/backups/check.txt",
];
const REQUIRED_INPUTS = [
  "database/migration/source/superpawnconv.mdb",
  "database/migration/source/Pictureconv.mdb",
  "database/migration/mappings/category-mapping.json",
  "database/migration/mappings/location-mapping.json",
  "database/migration/mappings/id-type-mapping.json",
];

const parseEnv = (content) => {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
};

const findDocker = (command) => {
  const candidates = ["docker"];
  if (process.platform === "darwin") {
    candidates.push("/Applications/Docker.app/Contents/Resources/bin/docker");
  } else if (process.platform === "win32") {
    candidates.push(
      path.join(
        process.env.ProgramFiles || "C:\\Program Files",
        "Docker",
        "Docker",
        "resources",
        "bin",
        "docker.exe",
      ),
    );
  }
  return candidates.find(
    (candidate) => command(candidate, ["compose", "version"]).status === 0,
  );
};

const prepareDevMigration = ({
  projectRoot = path.resolve(__dirname, ".."),
  run = spawnSync,
  log = console.log,
} = {}) => {
  const errors = [];
  const fail = (message) => errors.push(message);
  const command = (executable, args, extra = {}) =>
    run(executable, args, {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
      ...extra,
    });
  const finish = () => {
    for (const message of errors) log(`MISSING / INVALID: ${message}`);
    log("No containers were started and no database data was changed.");
    return errors.length ? 1 : 0;
  };

  if (Number(process.versions.node.split(".")[0]) < 22) {
    fail("Use Node.js 22 or newer.");
  }

  // Never create credentials until Git protection has been checked.
  for (const privatePath of PRIVATE_PATHS) {
    const result = command("git", [
      "check-ignore",
      "--no-index",
      "--quiet",
      privatePath,
    ]);
    if (result.status !== 0) {
      fail(
        `Git must ignore ${privatePath}. Check Git installation and .gitignore.`,
      );
    }
  }
  const tracked = command("git", [
    "ls-files",
    "--",
    ".env",
    "database/migration/source",
    "database/migration/exports",
    "database/migration/reports",
    "database/migration/backups",
  ]);
  if (tracked.status !== 0 || tracked.stdout?.trim()) {
    fail("Private migration files must not be tracked by Git.");
  }
  if (errors.length) return finish();

  for (const folder of [
    "source",
    "mappings",
    "exports",
    "reports",
    "backups",
  ]) {
    fs.mkdirSync(path.join(projectRoot, "database", "migration", folder), {
      recursive: true,
    });
  }
  log("Migration directories are available; mappings are versioned inputs.");

  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    const templatePath = path.join(projectRoot, ".env.example");
    if (!fs.existsSync(templatePath)) {
      fail("Restore .env.example before preparing local configuration.");
    } else {
      const template = fs.readFileSync(templatePath, "utf8");
      if (
        !/^DB_PASSWORD=.*$/m.test(template) ||
        !/^EMPLOYEE_PIN_SECRET=.*$/m.test(template)
      ) {
        fail(
          ".env.example must contain DB_PASSWORD and EMPLOYEE_PIN_SECRET entries.",
        );
      } else {
        const content = template
          .replace(
            /^DB_PASSWORD=.*$/m,
            `DB_PASSWORD=${crypto.randomBytes(24).toString("hex")}`,
          )
          .replace(
            /^EMPLOYEE_PIN_SECRET=.*$/m,
            `EMPLOYEE_PIN_SECRET=${crypto.randomBytes(32).toString("hex")}`,
          );
        fs.writeFileSync(envPath, content, { flag: "wx", mode: 0o600 });
        log(
          "Created private .env with a generated database password and employee PIN secret.",
        );
      }
    }
  } else {
    log("Existing .env preserved; credentials were not changed.");
  }

  if (fs.existsSync(envPath)) {
    const values = parseEnv(fs.readFileSync(envPath, "utf8"));
    // Match application and Compose behavior: process variables take precedence.
    for (const key of [
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USER",
      "DB_PASSWORD",
      "EMPLOYEE_PIN_SECRET",
    ]) {
      if (process.env[key] !== undefined) values[key] = process.env[key];
      if (!values[key]?.trim())
        fail(`Set ${key} in your private configuration.`);
    }
    if (!["localhost", "127.0.0.1"].includes(values.DB_HOST)) {
      fail(
        "This development migration expects DB_HOST=localhost or 127.0.0.1.",
      );
    }
    if (
      !/^\d+$/.test(values.DB_PORT ?? "") ||
      Number(values.DB_PORT) < 1 ||
      Number(values.DB_PORT) > 65535
    ) {
      fail("DB_PORT must be a valid host port (default 5433).");
    }
  }

  for (const relativePath of REQUIRED_INPUTS) {
    const filePath = path.join(projectRoot, relativePath);
    if (
      !fs.existsSync(filePath) ||
      !fs.statSync(filePath).isFile() ||
      fs.statSync(filePath).size === 0
    ) {
      const inputType = relativePath.startsWith("database/migration/mappings/")
        ? "versioned mapping"
        : "private source database";
      fail(`Provide a nonempty ${inputType}: ${relativePath}`);
    }
  }
  try {
    require("../database/migration/scripts/id-type-mapping.cjs").loadIdTypeMapping(
      path.join(
        projectRoot,
        "database/migration/mappings/id-type-mapping.json",
      ),
    );
  } catch (error) {
    fail(`Invalid ID type mapping: ${error.message}`);
  }
  for (const dependency of ["pg", "csv-parser", "electron"]) {
    try {
      require.resolve(dependency, { paths: [projectRoot] });
    } catch {
      fail(`Dependency ${dependency} is missing. Run npm ci.`);
    }
  }

  const docker = findDocker(command);
  if (!docker) {
    fail(
      "Install Docker Desktop with Docker Compose and reopen your terminal.",
    );
  } else {
    const info = command(docker, ["info", "--format", "{{.OSType}}"]);
    if (info.status !== 0) {
      fail("Start Docker Desktop and wait for the Docker engine to be ready.");
    } else if (info.stdout.trim() !== "linux") {
      fail("Switch Docker Desktop to Linux containers.");
    }
    if (fs.existsSync(envPath)) {
      const result = command(docker, [
        "compose",
        "--env-file",
        ".env",
        "-f",
        "docker/compose.yaml",
        "--profile",
        "migration",
        "config",
        "--quiet",
      ]);
      if (result.status !== 0) {
        // Do not print subprocess output: configuration errors can include values.
        fail(
          "Docker Compose configuration is invalid. Check .env and docker/compose.yaml.",
        );
      }
    }
    if (process.platform !== "linux" && docker !== "docker") {
      log(
        "Docker was found in its installation directory. Add its bin directory to PATH before using docker commands.",
      );
    }
  }

  if (!errors.length) {
    log(
      "Migration preparation checks passed. Input contents and target database state still require migration validation.",
    );
    log(
      "Next: docker compose --env-file .env -f docker/compose.yaml up -d --wait pawnsystemdb",
    );
  }
  return finish();
};

module.exports = { prepareDevMigration, parseEnv, findDocker };

if (require.main === module) {
  try {
    process.exitCode = prepareDevMigration();
  } catch {
    console.error(
      "Preparation could not finish. Check local file permissions and available disk space; existing configuration was not overwritten.",
    );
    process.exitCode = 1;
  }
}
