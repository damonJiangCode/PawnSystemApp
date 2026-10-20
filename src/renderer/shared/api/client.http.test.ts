import assert from "node:assert/strict";
import test from "node:test";
import {
  searchClientsHttp,
  searchClientsByDobHttp,
  createClientHttp,
  saveClientImageHttp,
} from "./client.http.ts";
import defaultClient from "../../modules/clients/data/defaultClient.ts";

test("HTTP search encodes names and restores client and ID dates", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert.equal(input.pathname, "/client");
    assert.equal(input.searchParams.get("firstName"), "Da &");
    assert.equal(input.searchParams.get("lastName"), "Wa");
    return Response.json([
      {
        client_number: 1,
        date_of_birth: "1990-01-01T00:00:00.000Z",
        updated_at: "2026-10-19T00:00:00.000Z",
        image_updated_at: null,
        identifications: [
          {
            id_type: "TEST",
            id_value: "123",
            updated_at: "2026-10-19T00:00:00.000Z",
          },
        ],
      },
    ]);
  });
  const [client] = await searchClientsHttp("Da &", "Wa");
  assert.ok(client.date_of_birth instanceof Date);
  assert.ok(client.updated_at instanceof Date);
  assert.ok(client.identifications?.[0].updated_at instanceof Date);
  assert.equal(client.image_updated_at, null);
});

test("HTTP search returns no matches without inventing data", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json([]));
  assert.deepEqual(await searchClientsHttp("Nobody", ""), []);
});

test("HTTP search surfaces DTO errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: ["Invalid name"] }, { status: 400 }),
  );
  await assert.rejects(searchClientsHttp("Da", ""), /Invalid name/);
});

test("HTTP search reports unavailable backend", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    searchClientsHttp("Da", ""),
    /Unable to reach the server/,
  );
});

test("DOB HTTP search uses the date endpoint and restores dates", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: URL) => {
    assert.equal(input.pathname, "/client/by-dob");
    assert.equal(input.searchParams.get("dateOfBirth"), "2000-02-29");
    assert.equal(input.searchParams.has("firstName"), false);
    return Response.json([
      {
        client_number: 1,
        date_of_birth: "2000-02-29T00:00:00Z",
        updated_at: "2026-10-19T00:00:00Z",
        identifications: [],
      },
    ]);
  });
  const [client] = await searchClientsByDobHttp("2000-02-29");
  assert.ok(client.date_of_birth instanceof Date);
  assert.equal(client.date_of_birth.toISOString(), "2000-02-29T00:00:00.000Z");
});

test("DOB HTTP search surfaces invalid date errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: ["Invalid date"] }, { status: 400 }),
  );
  await assert.rejects(searchClientsByDobHttp("2025-02-29"), /Invalid date/);
});

test("create sends only editable fields, a date-only DOB and restores the result", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/client");
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body as string);
    assert.equal(body.client.date_of_birth, "1990-01-01");
    assert.equal("redeem_count" in body.client, false);
    assert.equal("client_number" in body.client, false);
    assert.equal("updated_at" in body.client, false);
    assert.equal("image_path" in body.client, false);
    assert.deepEqual(body.photo, {
      fileName: "test.png",
      base64: "fixture-photo",
    });
    assert.deepEqual(body.identifications, [
      { id_type: "TEST", id_value: "123" },
    ]);
    return Response.json({
      ...body.client,
      client_number: 1,
      updated_at: "2026-10-19T00:00:00Z",
      identifications: body.identifications,
    });
  });
  const client = await createClientHttp({
    client: {
      ...defaultClient,
      date_of_birth: new Date(1990, 0, 1),
      client_number: 999,
      redeem_count: 999,
    },
    identifications: [{ id: 999, id_type: "TEST", id_value: "123" }],
    photo: { fileName: "test.png", base64: "fixture-photo" },
  });
  assert.equal(client.client_number, 1);
  assert.ok(client.updated_at instanceof Date);
});

test("create preserves employee field errors for the form", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      {
        field: "employee_password",
        message: "Employee password is incorrect.",
      },
      { status: 400 },
    ),
  );
  await assert.rejects(
    createClientHttp({
      client: defaultClient,
      identifications: [],
      photo: { fileName: "test.png", base64: "fixture-photo" },
    }),
    {
      message: "Employee password is incorrect.",
      field: "employee_password",
    },
  );
});

test("photo upload sends JSON and returns the server path", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.pathname, "/client/images");
    assert.equal(init.method, "POST");
    assert.deepEqual(JSON.parse(init.body as string), {
      fileName: "photo.png",
      base64: "test-image",
    });
    return Response.json({ imagePath: "images/clients/server-name.png" });
  });
  assert.equal(
    await saveClientImageHttp("photo.png", "test-image"),
    "images/clients/server-name.png",
  );
});
