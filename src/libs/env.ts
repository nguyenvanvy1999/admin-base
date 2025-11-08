import { type Static, Type as t } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Value } from '@sinclair/typebox/value';
import { LOG_LEVEL } from '../constants/log';

export const envSchema = t.Object({
  PORT: t.Number({ minimum: 0, maximum: 65535, default: 3000 }),
  POSTGRES_URL: t.String(),
  JWT_SECRET: t.String({ default: 'secret' }),
  LOG_LEVEL: t.Union(
    [
      t.Literal(LOG_LEVEL.DEBUG),
      t.Literal(LOG_LEVEL.INFO),
      t.Literal(LOG_LEVEL.WARNING),
      t.Literal(LOG_LEVEL.ERROR),
    ],
    { default: LOG_LEVEL.INFO },
  ),
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
