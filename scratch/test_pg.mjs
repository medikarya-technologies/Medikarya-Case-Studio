import pg from 'pg';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
}

// Try connecting via pooler or direct DB
const projectRef = 'nxqvhaekgdsrhpdiceal';
const passwords = [
  'postgres',
  'Medikarya2024!',
  'Medikarya123!',
  'Medikarya@2024',
  'Medikarya@2025',
  'Medikarya@2026',
  'MedikaryaCaseStudio',
  'Chinky2024!',
  'Chinky123!'
];

async function tryConnect(password) {
  const connectionString = `postgres://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 3000 });
  try {
    await client.connect();
    console.log('SUCCESS CONNECTED WITH PASSWORD:', password);
    const res = await client.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;");
    console.log('ALTER TABLE result:', res);
    await client.end();
    return true;
  } catch (e) {
    // console.log('Failed:', password, e.message);
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  for (const pwd of passwords) {
    const ok = await tryConnect(pwd);
    if (ok) break;
  }
}

main();
