/**
 * Development-only PostgreSQL launcher.
 *
 * Uses `embedded-postgres` to run a real PostgreSQL 17 cluster from ./data/postgres
 * without a system-wide installation or Docker. Production uses the `postgres`
 * service in docker-compose.yml instead.
 *
 *   node scripts/db.mjs start   -> initialise (first run), start and keep running
 *   node scripts/db.mjs reset   -> delete the cluster directory
 */
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, rmSync, readFileSync, copyFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(root, 'data', 'postgres');

/**
 * Windows only: the PostgreSQL binaries need the Visual C++ 2015-2022 runtime.
 * If it is not installed system-wide, copy the DLLs app-locally next to postgres.exe
 * from a known location on this machine (an officially supported deployment mode).
 * The proper fix is installing the redistributable: https://aka.ms/vs/17/release/vc_redist.x64.exe
 */
function ensureVcRuntimeOnWindows() {
  if (process.platform !== 'win32') return;
  const needed = ['vcruntime140.dll', 'vcruntime140_1.dll', 'msvcp140.dll'];
  const system32 = process.env.SystemRoot ? join(process.env.SystemRoot, 'System32') : 'C:\\Windows\\System32';
  if (needed.every((d) => existsSync(join(system32, d)))) return;

  let binDir;
  try {
    const require = createRequire(import.meta.url);
    binDir = join(dirname(require.resolve('@embedded-postgres/windows-x64/package.json')), 'native', 'bin');
  } catch {
    return;
  }
  if (!existsSync(binDir) || needed.every((d) => existsSync(join(binDir, d)))) return;

  const candidates = [];
  const pf86 = process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  for (const app of ['Microsoft\\Edge\\Application', 'Microsoft\\EdgeWebView\\Application', 'Microsoft\\EdgeCore']) {
    const base = join(pf86, app);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base)) {
      if (/^\d+(\.\d+)+$/.test(entry)) candidates.push(join(base, entry));
    }
  }
  if (process.env.LOCALAPPDATA) {
    const od = join(process.env.LOCALAPPDATA, 'Microsoft', 'OneDrive');
    if (existsSync(od)) for (const e of readdirSync(od)) if (/^\d+(\.\d+)+$/.test(e)) candidates.push(join(od, e));
  }

  const source = candidates.find((dir) => needed.every((d) => existsSync(join(dir, d))));
  if (!source) {
    console.warn(
      'Warning: the Visual C++ runtime (vcruntime140.dll, msvcp140.dll) was not found. ' +
        'Install it from https://aka.ms/vs/17/release/vc_redist.x64.exe if PostgreSQL fails to start.',
    );
    return;
  }
  for (const d of needed) copyFileSync(join(source, d), join(binDir, d));
  console.log(`Deployed Visual C++ runtime DLLs app-locally from ${source}`);
}

ensureVcRuntimeOnWindows();

function loadEnv() {
  const envPath = resolve(root, 'backend', '.env');
  const env = {};
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return {
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || 'postgres'),
      port: Number(u.port || 5432),
      database: u.pathname.replace(/^\//, '') || 'geeks',
    };
  } catch {
    return null;
  }
}

const env = loadEnv();
const conn =
  parseDatabaseUrl(env.DATABASE_URL) ??
  { user: 'postgres', password: 'postgres', port: 5433, database: 'geeks' };

const command = process.argv[2] ?? 'start';

if (command === 'reset') {
  if (existsSync(dataDir)) {
    rmSync(dataDir, { recursive: true, force: true });
    console.log(`Removed ${dataDir}`);
  } else {
    console.log('Nothing to reset.');
  }
  process.exit(0);
}

if (command !== 'start') {
  console.error(`Unknown command "${command}". Use start | reset.`);
  process.exit(1);
}

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: conn.user,
  password: conn.password,
  port: conn.port,
  persistent: true,
  authMethod: 'password',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: (msg) => process.stdout.write(String(msg)),
  onError: (msg) => process.stderr.write(String(msg)),
});

const firstRun = !existsSync(resolve(dataDir, 'PG_VERSION'));

try {
  if (firstRun) {
    console.log(`Initialising PostgreSQL cluster in ${dataDir} ...`);
    await pg.initialise();
  }
  await pg.start();
  if (firstRun) {
    await pg.createDatabase(conn.database);
    await pg.createDatabase(`${conn.database}_test`);
    console.log(`Created databases "${conn.database}" and "${conn.database}_test".`);
  }
  console.log(
    `\nPostgreSQL ready on port ${conn.port} (user=${conn.user}, db=${conn.database}). Press Ctrl+C to stop.\n`,
  );
} catch (err) {
  console.error('Failed to start embedded PostgreSQL:', err);
  process.exit(1);
}

const shutdown = async () => {
  console.log('\nStopping PostgreSQL ...');
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
