import { BetterSqliteDriver, defineConfig } from '@mikro-orm/better-sqlite';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

export default defineConfig({
  driver: BetterSqliteDriver,
  entities: ['src/entities'],
  dbName: 'investment',
  highlighter: new SqlHighlighter(),
});
