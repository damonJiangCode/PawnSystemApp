const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Execute real TypeScript functions with isolated database/IPC dependencies.
function load(relativePath, dependencies = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, "..", relativePath),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    console,
    Date,
    require: (name) => {
      if (!(name in dependencies))
        throw new Error(`Unexpected test dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

// Ticket issuing, convert and transfer guards for deactivated clients run on
// the server now: server/src/ticket/ticket-issue.http.spec.ts and
// ticket-actions.http.spec.ts. This file keeps the UI checks.
test("deactivation disables ticket issuance buttons while preserving existing-ticket actions", () => {
  const dependencies = {
    react: { default: require("react") },
    "../shared/TicketActionsLayout": { default: () => null },
    "../../../history/history.helpers": load(
      "frontend/src/modules/history/history.helpers.ts",
    ),
  };
  for (const icon of [
    "Add",
    "Sell",
    "Edit",
    "Print",
    "SwapHoriz",
    "Autorenew",
    "Replay",
    "Input",
    "Undo",
  ]) {
    dependencies[`@mui/icons-material/${icon}`] = { default: () => null };
  }
  const Transaction = load(
    "frontend/src/modules/tickets/components/transaction/TransactionTicketActions.tsx",
    dependencies,
  ).default;
  const History = load(
    "frontend/src/modules/tickets/components/history/HistoryTicketActions.tsx",
    dependencies,
  ).default;
  const transactionActions = Transaction({
    selectedTicket: { status: "pawned" },
    issuanceDisabled: true,
  }).props.actions;
  for (const action of transactionActions) {
    assert.equal(
      Boolean(action.disabled),
      ["Pawn", "Sell", "Conv", "Trns"].includes(action.label),
      action.label,
    );
  }
  const historyActions = History({
    selectedTicket: { status: "pawned_expired" },
    issuanceDisabled: true,
  }).props.actions;
  for (const action of historyActions) {
    assert.equal(
      Boolean(action.disabled),
      action.label === "Repn",
      action.label,
    );
  }
});
