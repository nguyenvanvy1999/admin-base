import { type Static, Type as t } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Value } from '@sinclair/typebox/value';
import { LOG_LEVEL } from '../constants/log';

export const envSchema = t.Object({
  PORT: t.Number({ minimum: 0, maximum: 65535, default: 3000 }),
  POSTGRES_URL: t.String(),
  JWT_SECRET: t.String({ default: 'secret' }),
  JWT_ACCESS_TOKEN_EXPIRED: t.String({ default: '15 minutes' }),
  JWT_REFRESH_TOKEN_EXPIRED: t.String({ default: '15 days' }),
  JWT_AUDIENCE: t.String({ default: 'https://example.com' }),
  JWT_ISSUER: t.String({ default: 'investment' }),
  JWT_SUBJECT: t.String({ default: 'investment' }),
  ENCRYPT_KEY: t.Optional(t.String()),
  ENCRYPT_IV: t.Optional(t.String()),
  LOG_LEVEL: t.Union(
    [
      t.Literal(LOG_LEVEL.DEBUG),
      t.Literal(LOG_LEVEL.INFO),
      t.Literal(LOG_LEVEL.WARNING),
      t.Literal(LOG_LEVEL.ERROR),
    ],
    { default: LOG_LEVEL.INFO },
  ),
  EXCHANGE_RATE_API_URL: t.Optional(
    t.String({
      default:
        'https://latest.currency-api.pages.dev/v1/currencies/vnd.min.json',
    }),
  ),
  EXCHANGE_RATE_CACHE_TTL: t.Optional(
    t.Number({ minimum: 0, default: 3600000 }),
  ),
  REDIS_URI: t.String({ default: 'redis://localhost:6379' }),
  AUTO_SEED: t.Optional(t.Boolean({ default: false })),
  AUTO_SEED_SUPER_ADMIN: t.Optional(t.Boolean({ default: false })),
});

const Compiler = TypeCompiler.Compile(envSchema);

const appEnv = Value.Parse(
  ['Clone', 'Clean', 'Default', 'Decode', 'Convert'],
  envSchema,
  process.env,
) as Static<typeof envSchema>;

if (!Compiler.Check(appEnv)) {
  const errors = [...Compiler.Errors(appEnv)].reduce((errors, e) => {
    const path = e.path.substring(1);
    return { ...errors, [path]: e.message };
  }, {});
  console.error('❌ Invalid environment variables:', errors);
  process.exit(1);
}

export type IEnv = Static<typeof envSchema>;
export { appEnv };
