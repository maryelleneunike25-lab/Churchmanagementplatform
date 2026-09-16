import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import csv from 'csv-parser'; // Need to install csv-parser if we want to run this, or just read json

const sql = neon(process.env.DATABASE_URL);

async function migrateData(csvFilePath) {
  // 1. Read CSV
  const records = [];
  await new Promise((resolve) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', resolve);
  });

  console.log(`Found ${records.length} records in CSV.`);
  
  // 2. Parse KV store
  const kvData = records.map(r => {
    let parsed;
    try {
      parsed = JSON.parse(r.value || '{}');
      if (typeof parsed !== 'object' || parsed === null) {
        parsed = { raw_value: parsed };
      }
    } catch (e) {
      parsed = { raw_value: r.value };
    }
    return { key: r.key, value: parsed };
  });

  // 3. Migrate raw KV data into `app_kv` table for fallback
  console.log('Migrating to app_kv fallback table...');
  let count = 0;
  for (const item of kvData) {
    count++;
    if (count % 100 === 0) console.log(`Migrated ${count} records...`);
    await sql`
      INSERT INTO app_kv (key, value) VALUES (${item.key}, ${JSON.stringify(item.value)}::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(item.value)}::jsonb
    `;
  }
  
  // 4. (Optional) In the future, we will write logic here to parse the `value` JSONs
  // and INSERT them into `jemaat`, `komsel`, `families`, etc. based on the exact keys
  // For now, loading them into `app_kv` ensures the app keeps running with our new `/api/kv/[key]` proxy endpoint!
  
  console.log('Migration complete!');
  process.exit(0);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Please provide the path to the CSV file.");
  process.exit(1);
}

migrateData(csvPath);
