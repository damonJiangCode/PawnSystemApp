import assert from "node:assert/strict";
import test from "node:test";
import { getWindowApi } from "./window";

test("getWindowApi returns the preload bridge, or undefined in a plain browser", (t) => {
  const host = globalThis as { window?: unknown };
  t.after(() => delete host.window);
  const bridge = { focusMainWindow: () => Promise.resolve() };
  host.window = { appAPI: { window: bridge } };
  assert.equal(getWindowApi(), bridge);
  host.window = {};
  assert.equal(getWindowApi(), undefined);
});
