// Dummy users for test mode (`npm run dev:test`), in the database named in .env.local.
//   node scripts/test-users.mjs create   makes them (safe to run again)
//   node scripts/test-users.mjs clean    removes them and everything they made: cases, reviews, payouts, certificates
//   node scripts/test-users.mjs list     shows what test data exists
// A dummy user's clerk_id starts with "dev_", which no real account can have, so real users are never touched.
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const USERS = [
  { clerk_id: 'dev_admin', name: 'Test Admin', email: 'test.admin@example.invalid', role: 'admin' },
  { clerk_id: 'dev_faculty', name: 'Dr. Test Faculty', email: 'test.faculty@example.invalid', role: 'reviewer' },
  { clerk_id: 'dev_author', name: 'Test Student', email: 'test.student@example.invalid', role: 'author' },
  { clerk_id: 'dev_applicant', name: 'Dr. Test Resident', email: 'test.resident@example.invalid', role: 'author' },
];

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

async function dummies() {
  return must(await db.from('users').select('id, clerk_id, name, role').like('clerk_id', 'dev\\_%'));
}

async function create() {
  for (const u of USERS) {
    const existing = must(await db.from('users').select('id').eq('clerk_id', u.clerk_id).maybeSingle());
    if (existing) must(await db.from('users').update({ name: u.name, role: u.role }).eq('id', existing.id));
    else must(await db.from('users').insert(u));
    console.log(existing ? 'reset  ' : 'created', u.clerk_id, '-', u.name, `(${u.role})`);
  }
}

async function clean() {
  const users = await dummies();
  if (users.length === 0) return console.log('No dummy users.');
  const ids = users.map((u) => u.id);
  const cases = must(await db.from('cases').select('id, title').in('author_id', ids));
  const caseIds = cases.map((c) => c.id);
  const none = ['00000000-0000-0000-0000-000000000000'];

  // What does not go away by itself when the users and their cases are deleted.
  const steps = [
    ['payouts (theirs)', db.from('payouts').delete({ count: 'exact' }).in('user_id', ids)],
    ['payouts (their cases)', db.from('payouts').delete({ count: 'exact' }).in('case_id', caseIds.length ? caseIds : none)],
    ['payouts marked paid by them', db.from('payouts').update({ paid_by: null }, { count: 'exact' }).in('paid_by', ids)],
    ['certificates', db.from('certificates').delete({ count: 'exact' }).in('user_id', ids)],
    ['reviewers verified by them', db.from('reviewer_profiles').update({ verified_by: null }, { count: 'exact' }).in('verified_by', ids)],
    ['name requests resolved by them', db.from('name_change_requests').update({ resolved_by: null }, { count: 'exact' }).in('resolved_by', ids)],
    ['cases', db.from('cases').delete({ count: 'exact' }).in('author_id', ids)],
    ['users', db.from('users').delete({ count: 'exact' }).in('id', ids)],
  ];
  for (const [what, query] of steps) {
    const { error, count } = await query;
    console.log(error ? `FAILED ${what}: ${error.message}` : `removed ${count ?? 0} ${what}`);
  }
}

async function list() {
  const users = await dummies();
  const ids = users.map((u) => u.id);
  console.log('dummy users:', users.map((u) => `${u.clerk_id} (${u.role})`).join(', ') || 'none');
  if (!ids.length) return;
  for (const [table, column] of [['cases', 'author_id'], ['reviewer_profiles', 'user_id'], ['conversion_reviews', 'reviewer_id'], ['payouts', 'user_id'], ['certificates', 'user_id']]) {
    const { count, error } = await db.from(table).select('*', { count: 'exact', head: true }).in(column, ids);
    console.log(`${table}:`, error ? error.message : count);
  }
}

const command = process.argv[2];
await ({ create, clean, list }[command] ?? (() => console.log('Usage: node scripts/test-users.mjs create | clean | list')))();
