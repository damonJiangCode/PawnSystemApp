const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, spawnSync } = require("node:child_process");
const {
  prepareDevMigration,
  parseEnv,
  findDocker,
} = require("./prepareDevMigration.cjs");
const {
  IDENTITY_SQL,
  previewCounts,
  assertEmptyDatabase,
  assertCounts,
  validateImportedDatabase,
  validationPassed,
} = require("./devMigrationChecks.cjs");

const hashFile = (filename) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filename);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const runCommand = (
  executable,
  args,
  { cwd, env, logPath, capture = false, timeout = 14400000 },
) =>
  new Promise((resolve, reject) => {
    const fd = logPath ? fs.openSync(logPath, "a", 0o600) : null;
    let stdout = "";
    let failed = false;
    const child = spawn(executable, args, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      timeout,
      stdio: ["ignore", fd ?? "pipe", fd ?? "pipe"],
    });
    const cancel = () => {
      failed = true;
      child.kill("SIGTERM");
    };
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    child.stdout?.on("data", (chunk) => {
      if (capture && stdout.length < 1024 * 1024) stdout += chunk.toString();
    });
    // Detailed tool output goes only to private log files, never to the console.
    child.stderr?.on("data", () => {});
    child.on("error", () => {
      failed = true;
    });
    child.on("close", (code) => {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
      if (fd !== null) fs.closeSync(fd);
      if (failed || code !== 0)
        reject(
          new Error("External command failed; inspect the private step log."),
        );
      else resolve({ stdout });
    });
  });

const connectDatabase = async (values) => {
  const { Client } = require("pg");
  const client = new Client({
    host: values.DB_HOST,
    port: Number(values.DB_PORT),
    database: values.DB_NAME,
    user: values.DB_USER,
    password: values.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
    query_timeout: 120000,
    application_name: "pawnsystem-dev-migration",
  });
  try {
    await client.connect();
  } catch {
    await client.end().catch(() => {});
    throw new Error(
      "Cannot connect to the development database. Start the Compose database and check .env.",
    );
  }
  return client;
};

const executeDevMigration = async ({
  projectRoot = path.resolve(__dirname, ".."),
  prepare = prepareDevMigration,
  run = runCommand,
  connect = connectDatabase,
  hash = hashFile,
  validate = validateImportedDatabase,
  docker: suppliedDocker,
  log = console.log,
} = {}) => {
  let client;
  let locked = false;
  let manifest;
  let manifestPath;
  let currentStep = "preparation";
  let writesStarted = false;
  const runId =
    new Date().toISOString().replace(/[:.]/g, "-") +
    "-" +
    crypto.randomBytes(4).toString("hex");
  const reportDir = path.join(projectRoot, "migration/reports", runId);
  const backupDir = path.join(projectRoot, "migration/backups", runId);
  const relativeReportDir = `migration/reports/${runId}`;
  const saveManifest = () => {
    if (manifestPath)
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", {
        mode: 0o600,
      });
  };
  try {
    if (prepare({ projectRoot, log }) !== 0)
      throw new Error(
        "Preparation checks failed. Resolve them before executing migration.",
      );
    const values = parseEnv(
      fs.readFileSync(path.join(projectRoot, ".env"), "utf8"),
    );
    const env = { ...process.env };
    for (const key of [
      "DB_HOST",
      "DB_PORT",
      "DB_NAME",
      "DB_USER",
      "DB_PASSWORD",
    ]) {
      if (process.env[key] !== undefined) values[key] = process.env[key];
      env[key] = values[key];
    }
    // Avoid inheriting a report directory from an unrelated shell session.
    delete env.MIGRATION_REPORT_DIR;
    const docker =
      suppliedDocker ||
      findDocker((executable, args) =>
        spawnSync(executable, args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: 15000,
          windowsHide: true,
        }),
      );
    if (!docker) throw new Error("Docker Compose was not found.");
    const composeArgs = [
      "compose",
      "--env-file",
      ".env",
      "-f",
      "docker/compose.yaml",
    ];
    const command = async (label, executable, args, extra = {}) => {
      currentStep = label;
      log(`Running: ${label}`);
      return run(executable, args, {
        cwd: projectRoot,
        env,
        logPath: manifestPath
          ? path.join(reportDir, `${label}.log`)
          : undefined,
        ...extra,
      });
    };
    const compose = (label, args, extra) =>
      command(label, docker, [...composeArgs, ...args], extra);
    const configResult = await compose(
      "check-compose-target",
      ["--profile", "migration", "config", "--format", "json"],
      { capture: true },
    );
    const config = JSON.parse(configResult.stdout);
    const databaseService = config.services.pawnsystemdb;
    const migrationService = config.services.migration;
    const port = databaseService.ports.find((p) => Number(p.target) === 5432);
    if (
      databaseService.image !== "postgres:16" ||
      !port ||
      port.host_ip !== "127.0.0.1" ||
      Number(port.published) !== Number(values.DB_PORT) ||
      databaseService.environment.POSTGRES_USER !== values.DB_USER ||
      databaseService.environment.POSTGRES_PASSWORD !== values.DB_PASSWORD ||
      databaseService.environment.POSTGRES_DB !== values.DB_NAME ||
      migrationService.environment.DB_HOST !== "pawnsystemdb" ||
      Number(migrationService.environment.DB_PORT) !== 5432
    ) {
      throw new Error("Compose and local database configuration do not agree.");
    }
    for (const [key, value] of [
      ["DB_USER", values.DB_USER],
      ["DB_PASSWORD", values.DB_PASSWORD],
      ["DB_NAME", values.DB_NAME],
    ]) {
      if (migrationService.environment[key] !== value)
        throw new Error(
          "Migration container database configuration does not match the target.",
        );
    }
    if (
      !databaseService.volumes?.some(
        (volume) =>
          volume.type === "volume" &&
          volume.source === "postgres_data" &&
          volume.target === "/var/lib/postgresql/data",
      )
    ) {
      throw new Error(
        "Compose and database persistence configuration do not agree.",
      );
    }
    for (const folder of ["source", "mappings", "exports", "reports"]) {
      const mount = migrationService.volumes?.find(
        (volume) => volume.target === `/app/migration/${folder}`,
      );
      const readOnly = folder === "source" || folder === "mappings";
      if (
        !mount ||
        mount.type !== "bind" ||
        path.resolve(mount.source) !==
          path.join(projectRoot, "migration", folder) ||
        Boolean(mount.read_only) !== readOnly
      ) {
        throw new Error(
          "Migration container mount configuration does not match this workspace.",
        );
      }
    }
    client = await connect(values);
    const version = (await client.query("SHOW server_version_num")).rows[0]
      .server_version_num;
    if (
      !Number.isFinite(Number(version)) ||
      Number(version) < 160000 ||
      Number(version) >= 170000
    )
      throw new Error("Target database must be running PostgreSQL 16.");
    const identity = (await client.query(IDENTITY_SQL)).rows[0].identity;
    const containerIdentity = await compose(
      "check-database-identity",
      [
        "exec",
        "-T",
        "pawnsystemdb",
        "psql",
        "-X",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        values.DB_USER,
        "-d",
        values.DB_NAME,
        "-At",
        "-c",
        IDENTITY_SQL,
      ],
      { capture: true },
    );
    if (
      JSON.stringify(identity) !==
      JSON.stringify(JSON.parse(containerIdentity.stdout.trim()))
    ) {
      throw new Error(
        "The application connection and Compose container point to different databases.",
      );
    }
    const lock = await client.query(
      "SELECT pg_try_advisory_lock(731005, 1601) AS acquired",
    );
    if (!lock.rows[0].acquired)
      throw new Error("Another migration is already using this database.");
    locked = true;
    await assertEmptyDatabase(client);
    // Fresh database only. Old exports must not get mixed into this run's photos.
    const exportRoot = path.join(projectRoot, "migration/exports");
    const containsFile = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).some((entry) => {
        if (entry.name === ".DS_Store" || entry.name === "Thumbs.db")
          return false;
        return !entry.isDirectory() || containsFile(path.join(dir, entry.name));
      });
    if (containsFile(exportRoot))
      throw new Error(
        "Migration exports already contain files. Use a clean development workspace; files were not deleted.",
      );

    fs.mkdirSync(reportDir, { recursive: true });
    fs.mkdirSync(backupDir, { recursive: true });
    manifestPath = path.join(reportDir, "execution.json");
    manifest = {
      run_id: runId,
      status: "running",
      started_at: new Date().toISOString(),
      database: values.DB_NAME,
      sources: {},
      mappings: {},
      backups: {},
      steps: [],
    };
    saveManifest();
    for (const filename of ["superpawnconv.mdb", "Pictureconv.mdb"]) {
      currentStep = `hash-${filename}`;
      log(`Recording source checksum: ${filename}`);
      manifest.sources[filename] = await hash(
        path.join(projectRoot, "migration/source", filename),
      );
      saveManifest();
    }
    for (const filename of [
      "category-mapping.json",
      "location-mapping.json",
      "client-mapping.json",
    ]) {
      manifest.mappings[filename] = await hash(
        path.join(projectRoot, "migration/mappings", filename),
      );
    }
    await command("check-archive-tool", "tar", ["--version"]);

    const backup = async (name) => {
      const temporary = `/tmp/pawnsystem-${runId}-${name}.dump`;
      const destination = path.join(backupDir, `${name}.dump`);
      await compose(`${name}-dump`, [
        "exec",
        "-T",
        "pawnsystemdb",
        "pg_dump",
        "-U",
        values.DB_USER,
        "-d",
        values.DB_NAME,
        "-Fc",
        "-f",
        temporary,
      ]);
      await compose(`${name}-archive-check`, [
        "exec",
        "-T",
        "pawnsystemdb",
        "pg_restore",
        "--list",
        temporary,
      ]);
      await compose(`${name}-copy`, [
        "cp",
        `pawnsystemdb:${temporary}`,
        destination,
      ]);
      if (!fs.statSync(destination).size)
        throw new Error("Database backup is empty.");
      manifest.backups[`${name}.dump`] = await hash(destination);
      saveManifest();
    };
    await backup("before-migration");
    const tsc = require.resolve("typescript/bin/tsc", { paths: [projectRoot] });
    await command("prepare-backend", process.execPath, [
      path.join(projectRoot, "scripts/prepareElectronBuild.cjs"),
    ]);
    await command("compile-backend", process.execPath, [
      tsc,
      "-p",
      "tsconfig.main.json",
    ]);
    await assertEmptyDatabase(client);
    writesStarted = true;
    await command("initialize-schema", process.execPath, [
      path.join(projectRoot, ".electron-build/main/database/runInit.js"),
    ]);
    await assertEmptyDatabase(client);
    await compose("build-migration-image", ["build", "migration"]);

    const migrate = async (script, args = []) => {
      const label =
        script.replace(/\.cjs$/, "") +
        (args.includes("--commit")
          ? "-commit"
          : args.includes("--update-db")
            ? "-photos"
            : "-preview");
      await compose(label, [
        "run",
        "--rm",
        "--no-deps",
        "-e",
        `MIGRATION_REPORT_DIR=/app/${relativeReportDir}`,
        "migration",
        `migration/scripts/${script}`,
        ...args,
      ]);
      manifest.steps.push(label);
      saveManifest();
    };
    const expectedCounts = {};
    await migrate("migrate-static.cjs");
    await migrate("migrate-city.cjs"); // This legacy script writes immediately.
    for (const kind of ["client", "employee", "ticket", "item"]) {
      await migrate(`migrate-${kind}.cjs`);
      currentStep = `check-${kind}-preview`;
      const reportPath = path.join(reportDir, `${kind}-migration.md`);
      const report = fs.readFileSync(reportPath, "utf8");
      const counts = previewCounts(kind, report);
      fs.copyFileSync(reportPath, path.join(reportDir, `${kind}-preview.md`));
      await migrate(`migrate-${kind}.cjs`, ["--commit"]);
      const committed = fs.readFileSync(reportPath, "utf8");
      if (!/^Mode: commit\s*$/m.test(committed))
        throw new Error("Expected a fresh commit report.");
      fs.copyFileSync(reportPath, path.join(reportDir, `${kind}-commit.md`));
      await assertCounts(client, counts);
      Object.assign(expectedCounts, counts);
      if (kind === "client" || kind === "item")
        await migrate(`migrate-${kind}-photos.cjs`, ["--update-db"]);
    }
    await migrate("migrate-client-statistics.cjs");
    await migrate("migrate-client-statistics.cjs", ["--commit"]);
    await assertCounts(client, expectedCounts);
    for (const [folder, fingerprints] of [
      ["source", manifest.sources],
      ["mappings", manifest.mappings],
    ]) {
      for (const [filename, checksum] of Object.entries(fingerprints)) {
        currentStep = `verify-input-${filename}`;
        if (
          (await hash(
            path.join(projectRoot, "migration", folder, filename),
          )) !== checksum
        )
          throw new Error(
            "A migration input changed during the run. Stop using this imported database.",
          );
      }
    }
    await backup("after-migration");
    const archive = path.join(backupDir, "photos.tar.gz");
    await command("backup-photos", "tar", [
      "-czf",
      archive,
      "-C",
      projectRoot,
      "migration/exports",
    ]);
    await command("check-photo-archive", "tar", ["-tzf", archive]);
    manifest.backups["photos.tar.gz"] = await hash(archive);
    currentStep = "validate-import";
    manifest.validation = await validate(client, projectRoot);
    saveManifest();
    if (!validationPassed(manifest.validation))
      throw new Error(
        "Final validation found unresolved issues. Inspect execution.json before using the database.",
      );
    manifest.status = "completed";
    manifest.finished_at = new Date().toISOString();
    saveManifest();
    log(`Migration completed. Private results: ${relativeReportDir}`);
    log(
      `Backups: migration/backups/${runId}. Copy them to independent storage and test a restore.`,
    );
    log(
      "Review source-data warnings in the private reports, then start the app with npm run dev.",
    );
    return 0;
  } catch (error) {
    if (manifest) {
      manifest.status = "failed";
      manifest.failed_step = currentStep;
      manifest.finished_at = new Date().toISOString();
      saveManifest();
    }
    // Deliberately do not print database errors, rows, or subprocess stderr.
    log(`Migration stopped at: ${currentStep}.`);
    const known =
      /^(Preparation checks|Docker Compose was not|Compose and|Migration container|Cannot connect|The application connection|Another migration|Target database|Migration exports|Client preview|Item preview|Ticket preview|Expected a fresh|Missing report metric|Invalid report metric|Preview prepared|Imported |A migration input|Final validation|Database backup|External command)/;
    log(
      known.test(error.message)
        ? error.message
        : "Inspect the private step logs and configuration; error details were not printed to protect private data.",
    );
    if (manifestPath) log(`Private results: ${relativeReportDir}`);
    if (writesStarted)
      log(
        "Earlier stages may have committed. No automatic rollback, reset, or resume was performed.",
      );
    return 1;
  } finally {
    if (client) {
      if (locked)
        await client
          .query("SELECT pg_advisory_unlock(731005, 1601)")
          .catch(() => {});
      await client.end().catch(() => {});
    }
  }
};

module.exports = { executeDevMigration, runCommand, hashFile };
if (require.main === module) {
  executeDevMigration()
    .then((code) => {
      process.exitCode = code;
    })
    .catch(() => {
      console.error(
        "Migration could not finish; inspect local configuration and private logs.",
      );
      process.exitCode = 1;
    });
}
