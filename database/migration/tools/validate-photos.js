import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { loadEnv } from "../../env.ts";
const { Pool } = pg;

loadEnv();
const root = path.resolve(import.meta.dirname, "../../..");
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
(async () => {
  try {
    for (const table of ["client", "item"]) {
      const { rows } = await pool.query(
        `SELECT image_path FROM ${table} WHERE coalesce(image_path, '') <> ''`,
      );
      let missing = 0;
      let outsideProject = 0;
      for (const row of rows) {
        const normalized = row.image_path.replace(/\\/g, "/");
        const filename = path.resolve(root, normalized);
        if (!filename.startsWith(root + path.sep)) outsideProject++;
        else if (!fs.existsSync(filename) || !fs.statSync(filename).isFile())
          missing++;
      }
      console.log(
        JSON.stringify({
          table,
          photoPaths: rows.length,
          missing,
          outsideProject,
        }),
      );
      if (missing || outsideProject) process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
