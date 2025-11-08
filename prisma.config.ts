import * as fs from 'node:fs';
import * as path from 'node:path';
import { defineConfig, env } from 'prisma/config';

const loadEnv = (file = '.env') => {
  const envPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, key, val] = m;
    key = key?.trim();
    val = val?.trim().replace(/^"(.*)"$/, '$1');
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
};

loadEnv();

export default defineConfig({
  schema: path.join('./prisma'),
  migrations: { path: path.join('./prisma', 'migrations') },
  engine: 'classic',
  datasource: { url: env('DB_URI') },
});
