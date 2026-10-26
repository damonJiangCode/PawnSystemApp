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

test("new server-uploaded client photos use HTTP", () => {
  const path = "images/clients/00000000-0000-4000-8000-000000000000.png";
  const url = new URL(getImageUrl("client", path)!);
  assert.equal(url.protocol, "http:");
  assert.equal(url.pathname, "/client/images");
  assert.equal(url.searchParams.get("path"), path);
});
