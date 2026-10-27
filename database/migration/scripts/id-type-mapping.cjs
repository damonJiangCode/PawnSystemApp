const fs = require("node:fs");
const path = require("node:path");

function loadIdTypeMapping(
  file = path.join(__dirname, "../mappings/id-type-mapping.json"),
) {
  const document = JSON.parse(fs.readFileSync(file, "utf8"));
  if (document.status !== "ready")
    throw new Error("ID type mapping must be marked ready before use.");
  if (
    !Array.isArray(document.target_types) ||
    !document.target_types.length ||
    !Array.isArray(document.rules) ||
    !document.rules.length
  )
    throw new Error("ID mapping requires nonempty target_types and rules.");
  const targets = new Set(),
    names = new Set();
  for (const target of document.target_types) {
    if (
      typeof target.type !== "string" ||
      !target.type.trim() ||
      target.type !== target.type.trim() ||
      typeof target.is_active !== "boolean"
    )
      throw new Error("Invalid ID target type.");
    const key = target.type.toUpperCase();
    if (names.has(key))
      throw new Error(`Duplicate ID target type: ${target.type}`);
    names.add(key);
    targets.add(target.type);
  }
  const rules = new Map();
  for (const rule of document.rules) {
    if (
      typeof rule.legacy_code !== "string" ||
      !["map", "review"].includes(rule.action) ||
      typeof rule.reason !== "string" ||
      !rule.reason.trim()
    )
      throw new Error("Invalid ID mapping rule.");
    const code = rule.legacy_code.trim().toUpperCase();
    if (rules.has(code))
      throw new Error(`Duplicate ID source code: ${code || "<blank>"}`);
    if (
      rule.action === "map" &&
      (!targets.has(rule.mapped_type) || rule.requires_review !== false)
    )
      throw new Error(`Unresolved ID target: ${code || "<blank>"}`);
    if (
      rule.action === "review" &&
      (rule.mapped_type !== null || rule.requires_review !== true)
    )
      throw new Error(`Review rule must not choose an ID target: ${code}`);
    rules.set(code, rule);
  }
  if (!rules.has(""))
    throw new Error("ID mapping must explicitly handle blank codes.");
  return { document, rules, targetTypes: document.target_types };
}

function resolveIdType(mapping, value) {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  return (
    mapping.rules.get(code) ?? {
      legacy_code: code,
      action: "review",
      mapped_type: null,
      requires_review: true,
      reason:
        "Unknown source code; choose a target or an explicit preservation rule before importing.",
    }
  );
}
module.exports = { loadIdTypeMapping, resolveIdType };
