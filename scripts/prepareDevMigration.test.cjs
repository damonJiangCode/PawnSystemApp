const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const { prepareDevMigration } = require("./prepareDevMigration.cjs");

const fixture = (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  assert.equal(spawnSync("git", ["init", "--quiet", root]).status, 0);
  fs.writeFileSync(
    path.join(root, ".gitignore"),
    ".env\n/migration/source/\n/migration/exports/\n/migration/reports/\n/migration/backups/\n",
  );
  fs.writeFileSync(
    path.join(root, ".env.example"),
    "DB_HOST=localhost\nDB_PORT=5433\nDB_NAME=pawnsystemdb\nDB_USER=pawnsystem_dev\nDB_PASSWORD=\n",
  );
  for (const name of ["pg", "csv-parser", "electron"]) {
    const folder = path.join(root, "node_modules", name);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "index.js"), "module.exports = {};\n");
  }
  for (const input of [
    "source/superpawnconv.mdb",
    "source/Pictureconv.mdb",
    "mappings/category-mapping.json",
    "mappings/location-mapping.json",
  ]) {
    const file = path.join(root, "migration", input);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      "Synthetic test input; not a real customer record.\n",
    );
  }
  assert.equal(
    spawnSync("git", ["add", "migration/mappings"], { cwd: root }).status,
    0,
  );
  const logs = [];
  const calls = [];
  const run = (executable, args, options) => {
    calls.push([executable, ...args]);
    if (executable === "git") return spawnSync(executable, args, options);
    if (args[0] === "info") return { status: 0, stdout: "linux\n" };
    return { status: 0, stdout: "" };
  };
  return {
    root,
    logs,
    calls,
    run,
    options: { projectRoot: root, run, log: (message) => logs.push(message) },
  };
};

test("accepts tracked mappings, generates credentials once, and never starts services", (t) => {
  const f = fixture(t);
  assert.equal(prepareDevMigration(f.options), 0);
  const content = fs.readFileSync(path.join(f.root, ".env"), "utf8");
  const password = content.match(/^DB_PASSWORD=(.+)$/m)[1];
  assert.match(password, /^[a-f0-9]{48}$/);
  assert.ok(!f.logs.join("\n").includes(password));
  for (const folder of [
    "source",
    "mappings",
    "exports",
    "reports",
    "backups",
  ]) {
    assert.ok(
      fs.statSync(path.join(f.root, "migration", folder)).isDirectory(),
    );
  }
  assert.equal(prepareDevMigration(f.options), 0);
  assert.equal(fs.readFileSync(path.join(f.root, ".env"), "utf8"), content);
  assert.ok(
    !f.calls.some((call) =>
      call.some((arg) => ["up", "run", "start", "down", "build"].includes(arg)),
    ),
  );
});

test("reports both missing mappings and a stopped Docker engine instead of declaring readiness", (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, "migration/mappings/category-mapping.json"));
  fs.unlinkSync(path.join(f.root, "migration/mappings/location-mapping.json"));
  const run = (executable, args, options) =>
    args[0] === "info"
      ? { status: 1, stdout: "", stderr: "Docker is stopped" }
      : f.run(executable, args, options);
  assert.equal(prepareDevMigration({ ...f.options, run }), 1);
  const output = f.logs.join("\n");
  assert.match(output, /category-mapping\.json/);
  assert.match(output, /location-mapping\.json/);
  assert.match(output, /Start Docker Desktop/);
  assert.doesNotMatch(output, /checks passed|Next:/);
});

test("does not repair or overwrite an existing invalid environment file", (t) => {
  const f = fixture(t);
  const content =
    "DB_HOST=localhost\nDB_PORT=invalid\nDB_NAME=pawnsystemdb\nDB_USER=pawnsystem_dev\nDB_PASSWORD=\n";
  fs.writeFileSync(path.join(f.root, ".env"), content);
  assert.equal(prepareDevMigration(f.options), 1);
  assert.equal(fs.readFileSync(path.join(f.root, ".env"), "utf8"), content);
  assert.match(f.logs.join("\n"), /DB_PASSWORD/);
  assert.match(f.logs.join("\n"), /DB_PORT/);
});

test("refuses to create private configuration when Git protection is missing", (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, ".gitignore"), "");
  assert.equal(prepareDevMigration(f.options), 1);
  assert.ok(!fs.existsSync(path.join(f.root, ".env")));
  assert.match(f.logs.join("\n"), /Git must ignore/);
});
