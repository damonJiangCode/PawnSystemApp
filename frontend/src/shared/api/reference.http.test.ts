import assert from "node:assert/strict";
import test from "node:test";
import { getAppApi } from "./app.api.ts";
import {
  addColorHttp,
  loadAllColorsHttp,
  loadCitiesHttp,
  loadColorsHttp,
  loadIdTypesHttp,
  setColorActiveHttp,
} from "./reference.http.ts";

for (const kind of ["hair", "eye"] as const) {
  test(`${kind} reference HTTP loads full state and preserves the appAPI return shapes`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
      assert.equal(url.origin, "http://store-server:3000");
      if (url.pathname.endsWith("/all"))
        return Response.json([{ color: "BLUE", is_active: false }]);
      assert.equal(
        init.headers &&
          (init.headers as Record<string, string>)["Content-Type"],
        "application/json",
      );
      assert.deepEqual(JSON.parse(init.body as string), { color: "blue" });
      if (init.method === "POST") {
        assert.equal(url.pathname, `/reference/${kind}-colors`);
        return Response.json({ color: "BLUE" }, { status: 201 });
      }
      assert.equal(init.method, "PATCH");
      const active = url.pathname.endsWith("/activate");
      assert.equal(
        url.pathname,
        `/reference/${kind}-colors/${active ? "activate" : "deactivate"}`,
      );
      return Response.json({ color: "BLUE", is_active: active });
    });
    const base = "http://store-server:3000/";
    assert.deepEqual(await loadAllColorsHttp(kind, base), [
      { color: "BLUE", is_active: false },
    ]);
    assert.equal(await addColorHttp(kind, "blue", base), "BLUE");
    assert.deepEqual(await setColorActiveHttp(kind, "blue", false, base), {
      color: "BLUE",
      is_active: false,
    });
    assert.deepEqual(await setColorActiveHttp(kind, "blue", true, base), {
      color: "BLUE",
      is_active: true,
    });
  });
}

test("color HTTP errors preserve the backend message for existing reference dialogs", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: "That hair color already exists." },
      { status: 409 },
    ),
  );
  await assert.rejects(
    () => addColorHttp("hair", "BLUE"),
    /That hair color already exists/,
  );
});

test("reference HTTP preserves the city response and uses the configured base URL", async (t) => {
  const data = { provinces: ["SK"], citiesByProvince: { SK: ["Saskatoon"] } };
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.toString(), "http://store-server:3000/reference/cities");
    assert.equal(init.method, undefined); // fetch defaults to GET.
    assert.equal(init.body, undefined);
    return Response.json(data);
  });
  assert.deepEqual(await loadCitiesHttp("http://store-server:3000/"), data);
});

const listLoaders = {
  "id-types": () => loadIdTypesHttp(),
  "hair-colors": () => loadColorsHttp("hair"),
  "eye-colors": () => loadColorsHttp("eye"),
};
for (const [resource, load] of Object.entries(listLoaders)) {
  test(`reference HTTP loads ${resource} as strings`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url: URL) => {
      assert.equal(url.pathname, `/reference/${resource}`);
      return Response.json(["TEST"]);
    });
    assert.deepEqual(await load(), ["TEST"]);
  });
}

test("reference HTTP surfaces server failures so the dropdown can show an error", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: "Internal server error" }, { status: 500 }),
  );
  await assert.rejects(() => loadIdTypesHttp(), /Internal server error/);
});

test("getAppApi serves client and reference over HTTP and keeps desktop domains", async (t) => {
  const loadDailyReport = () => Promise.resolve({} as never);
  const host = globalThis as { window?: unknown };
  host.window = { appAPI: { report: { loadDailyReport } } };
  t.after(() => delete host.window);
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://localhost:3000");
    paths.push(url.pathname);
    return Response.json([]);
  });
  const api = getAppApi()!;
  assert.equal(api.report.loadDailyReport, loadDailyReport);
  await api.reference.loadEyeColors();
  await api.client.searchClients("A", "B");
  assert.deepEqual(paths, ["/reference/eye-colors", "/client"]);
});

test("getAppApi is unavailable outside the desktop shell", (t) => {
  const host = globalThis as { window?: unknown };
  host.window = {};
  t.after(() => delete host.window);
  assert.equal(getAppApi(), undefined);
});
