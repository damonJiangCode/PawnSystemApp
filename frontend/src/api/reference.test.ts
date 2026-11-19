import assert from "node:assert/strict";
import test from "node:test";
import {
  addColorHttp,
  loadAllColorsHttp,
  loadCitiesHttp,
  loadColorsHttp,
  loadIdTypesHttp,
  setColorActiveHttp,
} from "./reference";
import * as http from "./reference";
import { clientApi } from "./client";

const baseUrl = "http://store-server:3000/";

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
        assert.equal(url.pathname, `/reference/colors/${kind}`);
        return Response.json({ color: "BLUE" }, { status: 201 });
      }
      assert.equal(init.method, "PATCH");
      const active = url.pathname.endsWith("/activate");
      assert.equal(
        url.pathname,
        `/reference/colors/${kind}/${active ? "activate" : "deactivate"}`,
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
  "colors/hair": () => loadColorsHttp("hair"),
  "colors/eye": () => loadColorsHttp("eye"),
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

test("the API object serves client and reference over HTTP", async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://localhost:3000");
    paths.push(url.pathname);
    return Response.json([]);
  });
  await http.referenceApi.loadEyeColors();
  await clientApi.searchClients("A", "B");
  assert.deepEqual(paths, ["/reference/colors/eye", "/clients"]);
});

// ID types
const item = { type: "Driver's License", is_active: true };

test("ID type HTTP uses JSON POST/PATCH and returns records with the original label", async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    paths.push(url.pathname);
    if (!init.method) return Response.json([item]);
    assert.equal(
      (init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    assert.deepEqual(JSON.parse(init.body as string), { type: item.type });
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/id-types");
      return Response.json(item, { status: 201 });
    }
    assert.equal(init.method, "PATCH");
    return Response.json({
      ...item,
      is_active: url.pathname.endsWith("/activate"),
    });
  });
  const base = "http://store-server:3000/";
  assert.deepEqual(await http.loadAllIdTypesHttp(base), [item]);
  assert.deepEqual(await http.addIdTypeHttp(item.type, base), item);
  assert.equal(
    (await http.setIdTypeActiveHttp(item.type, false, base)).is_active,
    false,
  );
  assert.equal(
    (await http.setIdTypeActiveHttp(item.type, true, base)).is_active,
    true,
  );
  assert.deepEqual(paths, [
    "/reference/id-types/all",
    "/reference/id-types",
    "/reference/id-types/deactivate",
    "/reference/id-types/activate",
  ]);
});

test("ID type HTTP forwards server validation/conflict errors and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ message: ["type must be a string"] }, { status: 400 }),
  );
  await assert.rejects(http.addIdTypeHttp(""), /type must be a string/);
  fetch.mock.mockImplementation(async () =>
    Response.json({ message: "That ID type already exists." }, { status: 409 }),
  );
  await assert.rejects(http.addIdTypeHttp(item.type), /already exists/);
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network");
  });
  await assert.rejects(http.loadAllIdTypesHttp(), /Unable to reach the server/);
});

test("the API object binds all ID type writes/reads to HTTP", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    if (!init.method)
      return Response.json(
        url.pathname.endsWith("/all") ? [item] : [item.type],
      );
    return Response.json({
      ...item,
      is_active: !url.pathname.endsWith("/deactivate"),
    });
  });
  assert.deepEqual(await http.referenceApi.loadIdTypes(), [item.type]);
  assert.deepEqual(await http.referenceApi.loadAllIdTypes(), [item]);
  assert.deepEqual(await http.referenceApi.addIdType(item.type), item);
  assert.equal(
    (await http.referenceApi.deactivateIdType(item.type)).is_active,
    false,
  );
  assert.equal(
    (await http.referenceApi.activateIdType(item.type)).is_active,
    true,
  );
  assert.deepEqual(calls, [
    "GET /reference/id-types",
    "GET /reference/id-types/all",
    "POST /reference/id-types",
    "PATCH /reference/id-types/deactivate",
    "PATCH /reference/id-types/activate",
  ]);
});

// Locations
const location = { location: "AB12", description: "Shelf A", is_active: true };

test("location HTTP preserves active-code and complete-reference response shapes", async (t) => {
  const paths: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.origin, "http://store-server:3000");
    paths.push(url.pathname);
    return Response.json(url.pathname.endsWith("/all") ? [location] : ["AB12"]);
  });
  assert.deepEqual(await http.loadLocationsHttp(baseUrl), ["AB12"]);
  assert.deepEqual(await http.loadAllLocationsHttp(baseUrl), [location]);
  assert.deepEqual(paths, ["/reference/locations", "/reference/locations/all"]);
});

test("location mutations send only editable JSON fields using POST and PATCH", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    assert.equal(
      (init.headers as Record<string, string>)["Content-Type"],
      "application/json",
    );
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/locations");
      assert.deepEqual(JSON.parse(init.body as string), {
        location: "AB12",
        description: "Shelf A",
      });
      return Response.json(location, { status: 201 });
    }
    assert.equal(init.method, "PATCH");
    assert.ok(
      [
        "/reference/locations/deactivate",
        "/reference/locations/activate",
      ].includes(url.pathname),
    );
    assert.deepEqual(JSON.parse(init.body as string), { location: "AB12" });
    return Response.json({
      ...location,
      is_active: url.pathname.endsWith("/activate"),
    });
  });
  assert.deepEqual(await http.addLocationHttp(location, baseUrl), location);
  assert.deepEqual(await http.setLocationActiveHttp("AB12", false, baseUrl), {
    ...location,
    is_active: false,
  });
  assert.deepEqual(
    await http.setLocationActiveHttp("AB12", true, baseUrl),
    location,
  );
});

test("location HTTP surfaces server validation/state errors and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: ["Invalid location", "Invalid description"] },
      { status: 400 },
    ),
  );
  await assert.rejects(
    http.addLocationHttp(location),
    /Invalid location; Invalid description/,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That location is already inactive." },
      { status: 409 },
    ),
  );
  await assert.rejects(
    http.setLocationActiveHttp("AB12", false),
    /already inactive/,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  await assert.rejects(http.loadLocationsHttp(), /Unable to reach the server/);
});

test("the API object routes all five location methods through HTTP", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    if (url.pathname.endsWith("/all")) return Response.json([location]);
    if (!init.method) return Response.json(["AB12"]);
    return Response.json(
      init.method === "PATCH"
        ? { ...location, is_active: url.pathname.endsWith("/activate") }
        : location,
    );
  });
  assert.deepEqual(await http.referenceApi.loadLocations(), ["AB12"]);
  assert.deepEqual(await http.referenceApi.loadAllLocations(), [location]);
  assert.deepEqual(await http.referenceApi.addLocation(location), location);
  assert.equal(
    (await http.referenceApi.deactivateLocation("AB12")).is_active,
    false,
  );
  assert.equal(
    (await http.referenceApi.activateLocation("AB12")).is_active,
    true,
  );
  assert.deepEqual(calls, [
    "GET /reference/locations",
    "GET /reference/locations/all",
    "POST /reference/locations",
    "PATCH /reference/locations/deactivate",
    "PATCH /reference/locations/activate",
  ]);
});

// Holidays
const holiday = { holiday_date: "2026-12-25", name: "Christmas" };

test("holiday HTTP lists date strings without timezone conversion", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.href, "http://store-server:3000/reference/holidays");
    return Response.json([holiday]);
  });
  const result = await http.loadHolidayDatesHttp(baseUrl);
  assert.deepEqual(result, [holiday]);
  assert.equal(typeof result[0].holiday_date, "string");
});

test("holiday HTTP sends POST details and DELETE path with no delete body", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://store-server:3000");
    if (init.method === "POST") {
      assert.equal(url.pathname, "/reference/holidays");
      assert.equal(
        (init.headers as Record<string, string>)["Content-Type"],
        "application/json",
      );
      assert.deepEqual(JSON.parse(init.body as string), holiday);
    } else {
      assert.equal(init.method, "DELETE");
      assert.equal(url.pathname, "/reference/holidays/2026-12-25");
      assert.equal(init.body, undefined);
    }
    return Response.json(holiday);
  });
  assert.deepEqual(await http.addHolidayDateHttp(holiday, baseUrl), holiday);
  assert.deepEqual(
    await http.deleteHolidayDateHttp(holiday.holiday_date, baseUrl),
    holiday,
  );
});

test("holiday HTTP safely encodes a supplied path segment", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: URL) => {
    assert.equal(url.pathname, "/reference/holidays/not%2Fa%3Fdate%23");
    assert.equal(url.search, "");
    assert.equal(url.hash, "");
    return Response.json({ message: "Invalid date" }, { status: 400 });
  });
  await assert.rejects(
    http.deleteHolidayDateHttp("not/a?date#", baseUrl),
    /Invalid date/,
  );
});

test("holiday HTTP preserves validation, duplicate, missing-date and network errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: ["Invalid date", "Name is required"] },
      { status: 400 },
    ),
  );
  await assert.rejects(
    http.addHolidayDateHttp(holiday),
    /Invalid date; Name is required/,
  );
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That holiday date has already been added." },
      { status: 409 },
    ),
  );
  await assert.rejects(http.addHolidayDateHttp(holiday), /already been added/);
  fetch.mock.mockImplementation(async () =>
    Response.json(
      { message: "That holiday date was not found." },
      { status: 404 },
    ),
  );
  await assert.rejects(
    http.deleteHolidayDateHttp(holiday.holiday_date),
    /not found/,
  );
  fetch.mock.mockImplementation(async () => {
    throw new Error("Network unavailable");
  });
  await assert.rejects(
    http.loadHolidayDatesHttp(),
    /Unable to reach the server/,
  );
});

test("the API object routes all existing holiday methods through HTTP", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: URL, init: RequestInit) => {
    assert.equal(url.origin, "http://localhost:3000");
    calls.push(`${init.method ?? "GET"} ${url.pathname}`);
    return Response.json(!init.method ? [holiday] : holiday);
  });
  assert.deepEqual(await http.referenceApi.loadHolidayDates(), [holiday]);
  assert.deepEqual(await http.referenceApi.addHolidayDate(holiday), holiday);
  assert.deepEqual(
    await http.referenceApi.deleteHolidayDate(holiday.holiday_date),
    holiday,
  );
  assert.deepEqual(calls, [
    "GET /reference/holidays",
    "POST /reference/holidays",
    "DELETE /reference/holidays/2026-12-25",
  ]);
});

// Item categories
const categories = [
  {
    category_id: 1,
    category_name: "Tools",
    subcategory_id: 3,
    subcategory_name: "Drills",
  },
];

test("item categories load from the reference route", async (t) => {
  const calls: string[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (url: URL, init: RequestInit = {}) => {
      calls.push(url.pathname);
      assert.equal(url.origin, "http://localhost:3000");
      assert.equal(init.method ?? "GET", "GET");
      return Response.json(categories);
    },
  );
  assert.deepEqual(await http.loadItemCategoriesHttp(), categories);
  assert.deepEqual(calls, ["/reference/item-categories"]);
});

test("item categories return empty lists and propagate HTTP and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json([]),
  );
  assert.deepEqual(await http.loadItemCategoriesHttp(), []);
  fetch.mock.mockImplementation(async () =>
    Response.json({ message: "Internal server error" }, { status: 500 }),
  );
  await assert.rejects(http.loadItemCategoriesHttp(), /Internal server error/);
  fetch.mock.mockImplementation(async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(http.loadItemCategoriesHttp());
});

test("item category management uses the reference routes, methods and bodies", async (t) => {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const category = { category_id: 1, category_name: "Tools", is_active: true };
  const subcategory = {
    subcategory_id: 3,
    category_id: 1,
    subcategory_name: "Drills",
    is_active: true,
  };
  t.mock.method(
    globalThis,
    "fetch",
    async (url: URL, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        path: url.pathname,
        method,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      });
      if (method === "GET")
        return Response.json([{ ...category, subcategories: [subcategory] }]);
      if (method === "POST")
        return Response.json(
          url.pathname.includes("subcategories") ? subcategory : category,
        );
      return Response.json(
        url.pathname.includes("subcategories") ? subcategory : category,
      );
    },
  );
  assert.deepEqual(await http.loadAllItemCategoriesHttp(), [
    { ...category, subcategories: [subcategory] },
  ]);
  assert.deepEqual(await http.addItemCategoryHttp("Tools"), category);
  assert.deepEqual(await http.addItemSubcategoryHttp(1, "Drills"), subcategory);
  assert.deepEqual(await http.setItemCategoryActiveHttp(1, false), category);
  assert.deepEqual(
    await http.setItemSubcategoryActiveHttp(3, true),
    subcategory,
  );
  assert.deepEqual(calls, [
    {
      path: "/reference/item-categories/all",
      method: "GET",
      body: undefined,
    },
    {
      path: "/reference/item-categories",
      method: "POST",
      body: { category_name: "Tools" },
    },
    {
      path: "/reference/item-subcategories",
      method: "POST",
      body: { category_id: 1, subcategory_name: "Drills" },
    },
    {
      path: "/reference/item-categories/1",
      method: "PATCH",
      body: { is_active: false },
    },
    {
      path: "/reference/item-subcategories/3",
      method: "PATCH",
      body: { is_active: true },
    },
  ]);
});

test("item category management surfaces server conflict messages", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(
      { message: "That subcategory already exists in this category." },
      { status: 409 },
    ),
  );
  await assert.rejects(
    http.addItemSubcategoryHttp(1, "Drills"),
    /already exists in this category/,
  );
});
