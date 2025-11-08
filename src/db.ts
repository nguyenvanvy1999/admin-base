import { Database } from 'bun:sqlite';
import { appEnv } from '@server/env';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './db/schema';

const sqlite = new Database(appEnv.DB_URI);
export const db = drizzle(sqlite, { schema });
