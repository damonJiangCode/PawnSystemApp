const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { spawnSync } = require("node:child_process");
const {
  executeDevMigration,
  runCommand,
} = require("./executeDevMigration.cjs");
const {
  previewCounts,
  assertEmptyDatabase,
  validateImportedDatabase,
  validationPassed,
} = require("./devMigrationChecks.cjs");

const validMetrics = () => ({
  active_managers: 1,
  missing_tickets: 0,
  missing_items: 0,
  missing_clients: 0,
  statistics_mismatches: 0,
  unresolved_active_locations: 0,
  conflicting_active_items: 0,
  sequence_errors: 0,
  missing_photos: 0,
  invalid_photo_paths: 0,
});

const fixture = (t, options = {}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "execute-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const folder of [
    "source",
    "mappings",
    "exports",
    "reports",
    "backups",
  ]) {
    fs.mkdirSync(path.join(root, "migration", folder), { recursive: true });
  }
  for (const name of [
    "source/superpawnconv.mdb",
    "source/Pictureconv.mdb",
    "mappings/category-mapping.json",
    "mappings/location-mapping.json",
  ]) {
    fs.writeFileSync(
      path.join(root, "migration", name),
      "Synthetic fixture only.\n",
    );
  }
  fs.writeFileSync(
    path.join(root, ".env"),
    "DB_HOST=localhost\nDB_PORT=5433\nDB_NAME=pawnsystemdb\nDB_USER=pawnsystem_dev\nDB_PASSWORD=test-only-private-password\n",
  );
  const compiler = path.join(root, "node_modules/typescript/bin");
  fs.mkdirSync(compiler, { recursive: true });
  fs.writeFileSync(
    path.join(compiler, "tsc"),
    "// fake compiler; never executed\n",
  );
  const counts = {
    client: 0,
    client_id: 0,
    employee: 0,
    ticket: 0,
    item: 0,
    ticket_item: 0,
  };
  const calls = [];
  const logs = [];
  let ended = false;
  let initialized = false;
  const identity = {
    database: "pawnsystemdb",
    database_oid: "42",
    system_identifier: "123456",
  };
  const client = {
    async query(sql) {
      if (sql.includes("server_version_num"))
        return { rows: [{ server_version_num: "160000" }] };
      if (sql.includes("pg_control_system")) return { rows: [{ identity }] };
      if (sql.includes("pg_try_advisory_lock"))
        return { rows: [{ acquired: true }] };
      if (sql.includes("pg_advisory_unlock")) return { rows: [] };
      if (sql.includes("FROM pg_tables"))
        return { rows: [{ tablename: "city" }, { tablename: "client" }] };
      if (sql.includes("SELECT EXISTS"))
        return {
          rows: [{ populated: options.populated || counts.client > 0 }],
        };
      const table = sql.match(/COUNT\(\*\)::int AS count FROM (\w+)/)?.[1];
      if (table) return { rows: [{ count: counts[table] }] };
      throw new Error("Unexpected fake database query");
    },
    async end() {
      ended = true;
    },
  };
  const run = async (executable, args, commandOptions) => {
    calls.push({ executable, args });
    if (args.includes("config"))
      return {
        stdout: JSON.stringify({
          services: {
            pawnsystemdb: {
              image: "postgres:16",
              volumes: [
                {
                  type: "volume",
                  source: "postgres_data",
                  target: "/var/lib/postgresql/data",
                },
              ],
              ports: [
                { target: 5432, published: "5433", host_ip: "127.0.0.1" },
              ],
              environment: {
                POSTGRES_USER: "pawnsystem_dev",
                POSTGRES_PASSWORD: "test-only-private-password",
                POSTGRES_DB: "pawnsystemdb",
              },
            },
            migration: {
              volumes: ["source", "mappings", "exports", "reports"].map(
                (folder) => ({
                  type: "bind",
                  source: path.join(root, "migration", folder),
                  target: `/app/migration/${folder}`,
                  read_only: folder === "source" || folder === "mappings",
                }),
              ),
              environment: {
                DB_HOST: "pawnsystemdb",
                DB_PORT: "5432",
                DB_USER: "pawnsystem_dev",
                DB_PASSWORD: "test-only-private-password",
                DB_NAME: "pawnsystemdb",
              },
            },
          },
        }),
      };
    if (args.includes("psql"))
      return {
        stdout: JSON.stringify(
          options.wrongIdentity
            ? { ...identity, system_identifier: "different" }
            : identity,
        ),
      };
    if (args.includes("cp")) {
      if (options.backupFails)
        throw new Error(
          "External command failed; inspect the private step log.",
        );
      fs.writeFileSync(args.at(-1), "synthetic dump");
    }
    if (args[0] === "-czf")
      fs.writeFileSync(args[1], "synthetic photo archive");
    if (args.some((arg) => arg.endsWith("/database/runInit.js")))
      initialized = true;
    const script = args.find((arg) => arg.startsWith("migration/scripts/"));
    if (script) {
      const reportRoot = path.join(
        root,
        args
          .find((arg) => arg.startsWith("MIGRATION_REPORT_DIR="))
          .split("=/app/")[1],
      );
      const kind = script.match(
        /migrate-(client|employee|ticket|item)\.cjs$/,
      )?.[1];
      if (kind) {
        const commit = args.includes("--commit");
        const bodies = {
          client: `Prepared client rows: 2\nPrepared client_id rows: 3\nBlocked client rows: ${options.clientBlocked ? 1 : 0}\n`,
          employee: "| Employees prepared | 2 |\n",
          ticket:
            "| Rows insertable | 2 |\n\n## Blockers\n\n_none_\n\n## Statuses\n\nTEST\n",
          item: "| Items prepared | 3 |\n| Ticket-item links prepared | 4 |\n| Blocker types | 0 |\n",
        };
        fs.writeFileSync(
          path.join(reportRoot, `${kind}-migration.md`),
          `# Synthetic report\n\nMode: ${commit ? "commit" : "preview"}\n\n${bodies[kind]}`,
        );
        if (commit)
          Object.assign(
            counts,
            {
              client: { client: 2, client_id: 3 },
              employee: { employee: 2 },
              ticket: { ticket: 2 },
              item: { item: 3, ticket_item: 4 },
            }[kind],
          );
      }
    }
    return { stdout: "" };
  };
  return {
    root,
    calls,
    logs,
    counts,
    options: {
      projectRoot: root,
      prepare: () => 0,
      docker: "fake-docker",
      run,
      connect: async () => client,
      validate: async () =>
        options.invalidFinal
          ? { ...validMetrics(), unresolved_active_locations: 1 }
          : validMetrics(),
      log: (message) => logs.push(message),
    },
    get ended() {
      return ended;
    },
    get initialized() {
      return initialized;
    },
  };
};

const committed = (f, kind) =>
  f.calls.some(
    ({ args }) =>
      args.includes(`migration/scripts/migrate-${kind}.cjs`) &&
      args.includes("--commit"),
  );

test("simulated execution imports in order, writes backups, and never starts/resets services", async (t) => {
  const f = fixture(t);
  assert.equal(await executeDevMigration(f.options), 0);
  assert.equal(f.ended, true);
  const commits = f.calls
    .filter(({ args }) => args.includes("--commit"))
    .map(({ args }) =>
      args.find((arg) => arg.startsWith("migration/scripts/")),
    );
  assert.deepEqual(
    commits,
    ["client", "employee", "ticket", "item", "client-statistics"].map(
      (kind) => `migration/scripts/migrate-${kind}.cjs`,
    ),
  );
  assert.ok(
    !f.calls.some(({ args }) =>
      args.some((arg) => ["up", "down", "stop", "start"].includes(arg)),
    ),
  );
  const run = fs.readdirSync(path.join(f.root, "migration/reports"))[0];
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(f.root, "migration/reports", run, "execution.json"),
      "utf8",
    ),
  );
  assert.equal(manifest.status, "completed");
  assert.deepEqual(Object.keys(manifest.mappings).sort(), [
    "category-mapping.json",
    "location-mapping.json",
  ]);
  for (const checksum of Object.values(manifest.mappings)) {
    assert.match(checksum, /^[a-f0-9]{64}$/);
  }
  assert.equal(Object.keys(manifest.backups).length, 3);
  assert.ok(!JSON.stringify(manifest).includes("test-only-private-password"));
  assert.ok(!f.logs.join("\n").includes("test-only-private-password"));
});

test("rejects an existing populated target before initialization, image build, or import", async (t) => {
  const f = fixture(t, { populated: true });
  assert.equal(await executeDevMigration(f.options), 1);
  assert.equal(f.initialized, false);
  assert.equal(
    fs.readdirSync(path.join(f.root, "migration/backups")).length,
    0,
  );
  assert.ok(
    !f.calls.some(({ args }) => args.includes("run") || args.includes("build")),
  );
  assert.match(f.logs.join("\n"), /already contains/);
  assert.equal(f.ended, true);
});

test("rejects an application connection pointing to a different database container", async (t) => {
  const f = fixture(t, { wrongIdentity: true });
  assert.equal(await executeDevMigration(f.options), 1);
  assert.equal(f.initialized, false);
  assert.match(f.logs.join("\n"), /different databases/);
});

test("backup failure prevents schema initialization and imports", async (t) => {
  const f = fixture(t, { backupFails: true });
  assert.equal(await executeDevMigration(f.options), 1);
  assert.equal(f.initialized, false);
  assert.ok(!committed(f, "client"));
});

test("a zero-exit preview with blockers never reaches the corresponding commit", async (t) => {
  const f = fixture(t, { clientBlocked: true });
  assert.equal(await executeDevMigration(f.options), 1);
  assert.ok(!committed(f, "client"));
  assert.ok(!committed(f, "employee"));
  assert.match(f.logs.join("\n"), /preview has blockers/);
});

test("unresolved final validation saves backups but cannot declare success", async (t) => {
  const f = fixture(t, { invalidFinal: true });
  assert.equal(await executeDevMigration(f.options), 1);
  const run = fs.readdirSync(path.join(f.root, "migration/reports"))[0];
  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(f.root, "migration/reports", run, "execution.json"),
      "utf8",
    ),
  );
  assert.equal(manifest.status, "failed");
  assert.equal(Object.keys(manifest.backups).length, 3);
  assert.doesNotMatch(f.logs.join("\n"), /Migration completed/);
});

test("private command logs capture stdout/stderr and nonzero exit rejects", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-log-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const filename = path.join(dir, "step.log");
  await assert.rejects(
    runCommand(
      process.execPath,
      [
        "-e",
        "console.log('synthetic stdout');console.error('synthetic stderr');process.exit(2)",
      ],
      {
        cwd: dir,
        env: process.env,
        logPath: filename,
      },
    ),
    /External command failed/,
  );
  assert.match(fs.readFileSync(filename, "utf8"), /synthetic stdout/);
  assert.match(fs.readFileSync(filename, "utf8"), /synthetic stderr/);
});

test("missing metrics and blocked item previews fail closed", () => {
  assert.throws(
    () => previewCounts("client", "Mode: preview\n"),
    /Missing report metric/,
  );
  assert.throws(
    () => previewCounts("item", "Mode: preview\n| Blocker types | 2 |\n"),
    /Item preview has blockers/,
  );
});

test("empty-target guard also rejects unexpected populated public tables", async () => {
  let queries = 0;
  await assert.rejects(
    assertEmptyDatabase({
      query: async () =>
        ++queries === 1
          ? { rows: [{ tablename: "unrecognized_records" }] }
          : { rows: [{ populated: true }] },
    }),
    /already contains/,
  );
});

test("final photo checks reject paths outside the expected exported-photo directory", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-photos-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const folder of ["client-photos", "item-photos"])
    fs.mkdirSync(path.join(dir, "migration/exports", folder), {
      recursive: true,
    });
  fs.writeFileSync(path.join(dir, "unrelated.txt"), "synthetic");
  const client = {
    query: async (sql) => {
      if (sql.includes("WITH stats")) return { rows: [validMetrics()] };
      if (sql.includes("pg_sequences"))
        return { rows: [{ maximum: "100", sequence_value: "100" }] };
      return { rows: [{ image_path: "unrelated.txt" }] };
    },
  };
  const metrics = await validateImportedDatabase(client, dir);
  assert.equal(metrics.invalid_photo_paths, 2);
  assert.equal(validationPassed(metrics), false);
});

test("final validation cannot pass with missing metrics or without an active manager", () => {
  assert.equal(validationPassed({ active_managers: 1 }), false);
  assert.equal(
    validationPassed({ ...validMetrics(), active_managers: 0 }),
    false,
  );
});

test("termination stops the child command rather than leaving a migration running", () => {
  const runner = require.resolve("./executeDevMigration.cjs");
  const code = `
    const {runCommand} = require(${JSON.stringify(runner)});
    const task = runCommand(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], {cwd:process.cwd(),env:process.env});
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 100);
    task.then(() => {process.exitCode=2;}, () => console.log('child cancelled'));
  `;
  const result = spawnSync(process.execPath, ["-e", code], {
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /child cancelled/);
});
