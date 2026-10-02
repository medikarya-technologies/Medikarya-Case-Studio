// Starts the studio in TEST MODE on http://localhost:3100: Clerk is replaced by dummy users you choose at /dev/login,
// so every role can be tried without signing up. It runs beside the normal dev server (its own .next-test folder).
// It uses the same database as .env.local, so make the dummy users first, and clear them when done:
//   node scripts/test-users.mjs create     node scripts/test-users.mjs clean
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const port = process.env.PORT || '3100';
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--turbopack', '-p', port], {
  stdio: 'inherit',
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  env: { ...process.env, STUDIO_TEST_LOGIN: '1' },
});
child.on('exit', (code) => process.exit(code ?? 0));
