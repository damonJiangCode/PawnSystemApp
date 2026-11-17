import assert from "node:assert/strict";
import test from "node:test";
import { getImageSrc } from "./http.ts";

test("getImageSrc adds the server address and keeps the photo version", () => {
  assert.equal(
    getImageSrc("/items/40/image?v=abc12345"),
    "http://localhost:3000/items/40/image?v=abc12345",
  );
});

test("getImageSrc returns null when there is no photo", () => {
  assert.equal(getImageSrc(null), null);
  assert.equal(getImageSrc(undefined), null);
  assert.equal(getImageSrc(""), null);
});
