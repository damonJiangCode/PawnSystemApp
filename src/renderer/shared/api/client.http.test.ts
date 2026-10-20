import assert from "node:assert/strict";
import test from "node:test";
import { searchClientsHttp, searchClientsByDobHttp } from "./client.http.ts";

test("HTTP search encodes names and restores client and ID dates", async t => {
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert.equal(input.pathname, "/client");
    assert.equal(input.searchParams.get("firstName"), "Da &");
    assert.equal(input.searchParams.get("lastName"), "Wa");
    return Response.json([{
      client_number: 1, date_of_birth: "1990-01-01T00:00:00.000Z",
      updated_at: "2026-10-19T00:00:00.000Z", image_updated_at: null,
      identifications: [{ id_type: "TEST", id_value: "123", updated_at: "2026-10-19T00:00:00.000Z" }],
    }]);
  });
  const [client] = await searchClientsHttp("Da &", "Wa");
  assert.ok(client.date_of_birth instanceof Date);
  assert.ok(client.updated_at instanceof Date);
  assert.ok(client.identifications?.[0].updated_at instanceof Date);
  assert.equal(client.image_updated_at, null);
});

test("HTTP search returns no matches without inventing data", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await searchClientsHttp("Nobody", ""), []);
});

test("HTTP search surfaces DTO errors", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ message: ["Invalid name"] }, { status: 400 }));
  await assert.rejects(searchClientsHttp("Da", ""), /Invalid name/);
});

test("HTTP search reports unavailable backend", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(searchClientsHttp("Da", ""), /Unable to reach the server/);
});


test("DOB HTTP search uses the date endpoint and restores dates", async t => {
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert.equal(input.pathname, "/client/by-dob");
    assert.equal(input.searchParams.get("dateOfBirth"), "2000-02-29");
    assert.equal(input.searchParams.has("firstName"), false);
    return Response.json([{
      client_number: 1, date_of_birth: "2000-02-29T00:00:00Z",
      updated_at: "2026-10-19T00:00:00Z", identifications: [],
    }]);
  });
  const [client] = await searchClientsByDobHttp("2000-02-29");
  assert.ok(client.date_of_birth instanceof Date);
  assert.equal(client.date_of_birth.toISOString(), "2000-02-29T00:00:00.000Z");
});

test("DOB HTTP search surfaces invalid date errors", async t => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ message: ["Invalid date"] }, { status: 400 }));
  await assert.rejects(searchClientsByDobHttp("2025-02-29"), /Invalid date/);
});
