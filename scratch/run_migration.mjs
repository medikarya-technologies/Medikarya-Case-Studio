import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('Testing column custom_fields in cases table...');
  const { data, error } = await supabase.from('cases').select('id, custom_fields').limit(1);
  if (!error) {
    console.log('SUCCESS: custom_fields column exists in cases table!');
    process.exit(0);
  }
  
  console.log('custom_fields column missing or error:', error.message);

  // Execute sql via postgres rest api or postgres connection
  // Using Supabase management API or sql endpoint if enabled
  const sql = "ALTER TABLE cases ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '[]'::jsonb;";
  
  // Try via sql endpoint
  const res = await fetch(`${supabaseUrl}/rest/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query: sql })
  });

  console.log('Status:', res.status, await res.text());
}

main();
