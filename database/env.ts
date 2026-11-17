import fs from "fs";
import path from "path";

let isLoaded = false;

export const loadEnv = () => {
  if (isLoaded) {
    return;
  }

  isLoaded = true;
  // The private .env lives at the repository root, one level above this package.
  const envPath = path.resolve(import.meta.dirname, "..", ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    const value = line.slice(equalIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};
