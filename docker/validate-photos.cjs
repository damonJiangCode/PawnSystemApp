const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
require('../.electron-build/database/env.js').loadEnv();
const root = path.resolve(__dirname, '..');
const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 5432), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
(async () => {
  try {
    for (const table of ['client', 'item']) {
      const { rows } = await pool.query(`SELECT image_path FROM ${table} WHERE coalesce(image_path, '') <> ''`);
      let missing = 0;
      let outsideProject = 0;
      for (const row of rows) {
        const normalized = row.image_path.replace(/\\/g, '/');
        const filename = path.resolve(root, normalized.startsWith('migration/exports/') ? `database/${normalized}` : row.image_path);
        if (!filename.startsWith(root + path.sep)) outsideProject++;
        else if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) missing++;
      }
      console.log(JSON.stringify({ table, photoPaths: rows.length, missing, outsideProject }));
      if (missing || outsideProject) process.exitCode = 1;
    }
  } finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
