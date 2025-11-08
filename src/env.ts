import { type Static, Type as t } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Value } from '@sinclair/typebox/value';

export const envSchema = t.Object({
  PORT: t.Number({ minimum: 0, maximum: 65535, default: 3000 }),
  DB_URI: t.String({
    default: 'file:./investment.db',
  }),
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
