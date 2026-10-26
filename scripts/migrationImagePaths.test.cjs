const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

test("Electron resolves old and new migration photo paths after moving the folder", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "migration-image-paths-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = fs.readFileSync(
    path.join(__dirname, "../electron/src/main/shared/imageStorage.ts"),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    process: { cwd: () => root },
    require: (name) =>
      name === "electron/main"
        ? { app: { getPath: () => path.join(root, "userData") } }
        : require(name),
  });
  for (const kind of ["client", "item"]) {
    const relative = `database/migration/exports/${kind}-photos/test.jpg`;
    const filename = path.join(root, relative);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, "test photo fixture");
    assert.equal(
      await exports.imageStorage.resolveImageFile(kind, relative),
      filename,
    );
    assert.equal(
      await exports.imageStorage.resolveImageFile(
        kind,
        relative.slice("database/".length),
      ),
      filename,
    );
  }
  const outside = path.join(root, "private.txt");
  fs.writeFileSync(outside, "not a photo");
  assert.equal(
    await exports.imageStorage.resolveImageFile("client", outside),
    null,
  );
});
