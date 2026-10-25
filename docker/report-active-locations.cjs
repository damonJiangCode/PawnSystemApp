const fs = require('node:fs');
const { spawn } = require('node:child_process');
const csv = require('csv-parser');
const { Pool } = require('pg');
const pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
(async () => {
  try {
    const { rows } = await pool.query("SELECT ticket_number FROM ticket WHERE status='pawned' AND location='UNKNOWN' ORDER BY ticket_number");
    const affected = new Map(rows.map(row => [String(row.ticket_number), '']));
    const child = spawn('mdb-export', ['-b', 'strip', 'database/migration/source/superpawnconv.mdb', 'SA100TRAN']);
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    const completion = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => code === 0 ? resolve() : reject(new Error(stderr || `mdb-export exit ${code}`)));
    });
    const parser = child.stdout.pipe(csv());
    for await (const row of parser) {
      const number = String(row.SA100TRANACTNO || '').trim();
      if (affected.has(number)) affected.set(number, String(row.SA100LOCATION || '').trim());
    }
    await completion;
    const report = '# Active tickets requiring location review\n\nGenerated from the current source and target database. These active pawn tickets map to UNKNOWN under the existing rules. Resolve before production cutover.\n\n| Ticket number | Legacy location |\n| --- | --- |\n' + [...affected].map(([number, location]) => `| ${number} | ${location.replace(/\|/g, '\\|')} |`).join('\n') + '\n';
    fs.writeFileSync('database/migration/reports/active-location-review.md', report);
    console.log(`Active locations requiring review: ${affected.size}`);
  } finally { await pool.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
