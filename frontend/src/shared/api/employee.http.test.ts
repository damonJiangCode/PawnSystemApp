import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { getAppApi } from "./app.api.ts";
import * as http from "./employee.http.ts";

const setWindow = (t: TestContext, appAPI: unknown) => {
  const host = globalThis as { window?: unknown };
  host.window = { appAPI };
  t.after(() => delete host.window);
};

const base = "http://store-server:3000/";
const details = {
  first_name: "anna",
  last_name: "lee",
  nickname: "",
  date_of_birth: "1990-04-02",
  gender: "female",
  is_terminated: false,
  is_manager: false,
  address: "",
  phone: "",
  email: "",
  manager_password: "boss",
};
const saved = {
  ...details,
  employee_number: 5,
  first_name: "ANNA",
  last_name: "LEE",
  created_at: "2026-10-28T00:00:00.000Z",
  updated_at: "2026-10-28T01:00:00.000Z",
};
const { manager_password: _manager, ...savedFields } = saved;

test("search sends only non-empty trimmed filters and converts timestamps", async (t) => {
  const urls: URL[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    urls.push(url);
    return Response.json([savedFields]);
  });
  const [employee] = await http.searchEmployeesHttp(
    { first_name: " an ", last_name: "  " },
    base,
  );
  await http.searchEmployeesHttp({}, base);
  assert.equal(urls[0].origin, "http://store-server:3000");
  assert.equal(urls[0].pathname, "/employees");
  assert.equal(urls[0].search, "?first_name=an");
  assert.equal(urls[1].search, "");
  assert.ok(employee.created_at instanceof Date);
  assert.equal(employee.updated_at?.toISOString(), saved.updated_at);
});

test("create POSTs editable fields and the PIN, never server-owned fields", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/employees");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body as string), {
      ...details,
      password: "1234",
    });
    return Response.json(savedFields, { status: 201 });
  });
  const employee = await http.createEmployeeHttp(
    {
      ...details,
      password: "1234",
      employee_number: 99,
      created_at: "x",
    } as never,
    base,
  );
  assert.equal(employee.employee_number, 5);
});

test("update PUTs to the employee and omits a blank password", async (t) => {
  const bodies: unknown[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/employees/5");
    assert.equal(init.method, "PUT");
    bodies.push(JSON.parse(init.body as string));
    return Response.json(savedFields);
  });
  await http.updateEmployeeHttp(5, { ...details, password: "  " }, base);
  await http.updateEmployeeHttp(5, { ...details, password: " 77 " }, base);
  assert.deepEqual(bodies[0], details);
  assert.deepEqual(bodies[1], { ...details, password: "77" });
});

test("save errors keep the server field for the form", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        field: "manager_password",
        message: "Manager password is incorrect.",
      },
      { status: 403 },
    ),
  );
  await assert.rejects(
    http.createEmployeeHttp({ ...details, password: "1" }, base),
    { message: "Manager password is incorrect.", field: "manager_password" },
  );
});

test("getAppApi serves employee over HTTP, not the desktop bridge", async (t) => {
  setWindow(t, {
    employee: {
      searchEmployees: () => {
        throw new Error("IPC must not be used");
      },
    },
  });
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/employees");
    return Response.json([]);
  });
  assert.deepEqual(await getAppApi()?.employee.searchEmployees({}), []);
});
