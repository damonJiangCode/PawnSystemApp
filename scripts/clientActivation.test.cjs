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

function fixture(inactive = []) {
  const calls = [];
  const connection = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (sql.includes("SELECT client_number, is_active")) {
        return {
          rows: values[0].map((client_number) => ({
            client_number,
            is_active: !inactive.includes(client_number),
          })),
        };
      }
      return { rows: [] };
    },
    release: () => calls.push({ sql: "release" }),
  };
  const mapper = load("electron/src/main/modules/clients/client.mapper.ts");
  const { clientRepo } = load(
    "electron/src/main/modules/clients/client.repo.ts",
    {
      "../../../../../database/connection.ts": {
        connect: () => {
          throw new Error("Unexpected extra connection");
        },
      },
      "./client.mapper.ts": mapper,
    },
  );
  const transaction = load("electron/src/main/shared/runInTransaction.ts", {
    "../../../../database/connection.ts": { connect: async () => connection },
  });
  const ticket = { ticket_number: 100, client_number: 11, status: "pawned" };
  const ticketRepo = {
    loadByTicketNumberForUpdate: async () => {
      calls.push({ sql: "lock-ticket" });
      return ticket;
    },
    create: async () => {
      calls.push({ sql: "create-ticket" });
      return ticket;
    },
    convert: async () => {
      calls.push({ sql: "convert-ticket" });
      return ticket;
    },
    transfer: async () => {
      calls.push({ sql: "transfer-ticket" });
      return ticket;
    },
  };
  const { ticketService } = load(
    "electron/src/main/modules/tickets/ticket.service.ts",
    {
      "../clients/client.repo.ts": { clientRepo },
      "./ticket.repo.ts": { ticketRepo },
      "../../shared/runInTransaction.ts": transaction,
      "../../shared/createFieldError.ts": load(
        "electron/src/main/shared/createFieldError.ts",
      ),
      "../employees/employee.service.ts": {
        employeeService: {
          getEmployeeDisplayNameByPassword: async () => "STAFF",
        },
      },
      "./ticket.input.ts": {
        ticketInput: Object.fromEntries(
          [
            "normalizeCreatePawnTicket",
            "normalizeCreateSellTicket",
            "normalizeConvertTicket",
            "normalizeTransferTicket",
          ].map((name) => [name, (value) => value]),
        ),
      },
      "../../../../../shared/utils/calculation.ts": {
        calculation: {
          getCurrentDatetime: () => new Date(),
          getDueDatetime: () => new Date(),
          getSellDueDatetime: () => new Date(),
        },
      },
    },
  );
  return { calls, clientRepo, ticketService, connection };
}

for (const operation of [
  "createPawnTicket",
  "createSellTicket",
  "convertTicket",
]) {
  test(`${operation} rejects deactivated clients and rolls back before writing`, async () => {
    const { ticketService, calls } = fixture([11]);
    await assert.rejects(
      () =>
        ticketService[operation]({
          client_number: 11,
          ticket_number: 100,
          target_status: "sold",
          amount: 10,
          onetime_fee: 0,
          description: "TEST",
          location: "TEST",
          employee_password: "code",
        }),
      /Deactivated clients/,
    );
    assert.ok(calls.some((call) => call.sql === "ROLLBACK"));
    assert.ok(
      !calls.some((call) =>
        /^(create|convert|transfer)-ticket$/.test(call.sql),
      ),
    );
    assert.ok(!calls.some((call) => call.sql === "COMMIT"));
    assert.equal(calls.at(-1).sql, "release");
  });
}

for (const inactive of [[11], [22]]) {
  test(`transfer rejects an inactive source or target (${inactive[0]})`, async () => {
    const { ticketService, calls } = fixture(inactive);
    await assert.rejects(
      () =>
        ticketService.transferTicket({ ticket_number: 100, client_number: 22 }),
      /Deactivated clients/,
    );
    assert.ok(!calls.some((call) => call.sql === "transfer-ticket"));
    assert.ok(calls.some((call) => call.sql === "ROLLBACK"));
  });
}

for (const operation of [
  "createPawnTicket",
  "createSellTicket",
  "convertTicket",
]) {
  test(`${operation} still succeeds for active clients`, async () => {
    const { ticketService, calls } = fixture();
    await ticketService[operation]({
      client_number: 11,
      ticket_number: 100,
      target_status: "sold",
      amount: 10,
      onetime_fee: 0,
      description: "TEST",
      location: "TEST",
      employee_password: "code",
    });
    assert.ok(calls.some((call) => /^(create|convert)-ticket$/.test(call.sql)));
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
  });
}

test("active transfer locks the current ticket and both clients before writing and committing", async () => {
  const { ticketService, calls } = fixture();
  await ticketService.transferTicket({ ticket_number: 100, client_number: 22 });
  const lock = calls.findIndex((call) =>
    call.sql.includes("SELECT client_number, is_active"),
  );
  assert.ok(calls.findIndex((call) => call.sql === "lock-ticket") < lock);
  assert.match(calls[lock].sql, /ORDER BY client_number FOR UPDATE/);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[lock].values)), [[11, 22]]);
  assert.ok(lock < calls.findIndex((call) => call.sql === "transfer-ticket"));
  assert.ok(calls.some((call) => call.sql === "COMMIT"));
});

test("activation guard orders and deduplicates locks and rejects missing clients", async () => {
  const { clientRepo, calls, connection } = fixture();
  await clientRepo.assertActiveForTicket([22, 11, 22], connection);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].values)), [[11, 22]]);
  await assert.rejects(
    () => clientRepo.assertActiveForTicket([0], connection),
    /valid client/,
  );
  await assert.rejects(
    () =>
      clientRepo.assertActiveForTicket([11], {
        query: async () => ({ rows: [] }),
      }),
    /Client not found/,
  );
});

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
