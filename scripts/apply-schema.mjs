#!/usr/bin/env node
/**
 * Apply idempotent entitlement + product-events DDL via direct Postgres.
 * Requires SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in env (.env.local).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(root, '.env.local'));
loadEnvFile(resolve(root, '.env.vercel.prod'));

function resolveDbUrl() {
  const direct = process.env.SUPABASE_DB_URL?.trim();
  if (direct) return direct;

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  if (!password || !supabaseUrl) return null;

  const host = new URL(supabaseUrl).hostname;
  const projectRef = host.split('.')[0];
  const region = process.env.SUPABASE_DB_REGION?.trim() || 'ap-northeast-2';
  return `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
}

const dbUrl = resolveDbUrl();
if (!dbUrl) {
  console.error(
    'Missing database credentials. Set SUPABASE_DB_URL or SUPABASE_DB_PASSWORD in server/.env.local',
  );
  process.exit(1);
}

const schemaPath = resolve(root, 'supabase/schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name in ('tabata_entitlement_grants', 'tabata_product_events')
     order by table_name`,
  );
  console.log(
    'Schema applied. Tables present:',
    rows.map((row) => row.table_name).join(', ') || '(none)',
  );
} catch (error) {
  console.error('Schema apply failed:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
