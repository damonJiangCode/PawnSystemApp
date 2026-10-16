import assert from "node:assert/strict";
import test from "node:test";
import { getImageUrl } from "./imageUrl.ts";

test("builds a client image protocol URL from a stored relative path", () => {
  const url = getImageUrl(
    "client",
    "migration/exports/client-photos/8688_TEST CLIENT.jpg",
  );

  assert.equal(
    url,
    "pawn-image://client/image?path=migration%2Fexports%2Fclient-photos%2F8688_TEST+CLIENT.jpg",
  );
});

test("returns null when an image path is unavailable", () => {
  assert.equal(getImageUrl("item", ""), null);
  assert.equal(getImageUrl("item"), null);
});
