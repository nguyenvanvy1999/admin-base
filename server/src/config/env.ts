import { type Static, Type as t } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { Value } from '@sinclair/typebox/value';
import { APP_ENV, LOG_LEVEL, REGEX_HTTP_METHOD, REGEX_TIME } from 'src/share';

export const envSchema = t.Object({
  APP_ENV: t.Enum(APP_ENV, { default: APP_ENV.DEV }),
  APP_NAME: t.String({ minLength: 1 }),
  PORT: t.Number({ minimum: 0, maximum: 65535, default: 3000 }),
  ENB_HTTP_LOG: t.Boolean({ default: true }),
  REQ_BODY_MAX_SIZE_MB: t.Number({ minimum: 0, default: 256 }),
  REQ_TIMEOUT_SECOND: t.Number({ minimum: 0, default: 10 }),

  ENB_SEED: t.Boolean({ default: false }),
  ENB_WARM_CACHE: t.Boolean({ default: false }),
  ENB_CLUSTER: t.Boolean({ default: false }),

  API_PREFIX: t.String({ default: 'api' }),

  COMMIT_HASH: t.String(),
  BUILD_DATE: t.Integer(),
  BUILD_NUMBER: t.String(),

  POSTGRESQL_URI: t.String(),

  REDIS_URI: t.String({ default: 'redis://localhost:6379' }),
  REDIS_RETRY: t.Number({ minimum: 1, maximum: 100, default: 5 }),

  CORS_ALLOW_METHOD: t.Optional(t.RegExp(REGEX_HTTP_METHOD)),
  CORS_ALLOW_HEADERS: t.String({ default: '*' }),
  CORS_ALLOW_ORIGIN: t.String({ default: '*' }),

  JWT_AUDIENCE: t.String({ default: 'https://example.com' }),
  JWT_ISSUER: t.String({ default: 'admin' }),
  JWT_SUBJECT: t.String({ default: 'admin' }),

  JWT_ACCESS_TOKEN_SECRET_KEY: t.String(),
  JWT_ACCESS_TOKEN_EXPIRED: t.RegExp(REGEX_TIME, { default: '15 minutes' }),
  JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: t.RegExp(REGEX_TIME, {
    default: '0 second',
  }),
  JWT_REFRESH_TOKEN_EXPIRED: t.RegExp(REGEX_TIME, { default: '15 days' }),

  SYSTEM_PASSWORD: t.String(),
  ADMIN_PASSWORD: t.String(),

  SALT_LENGTH: t.Integer({ minimum: 8, maximum: 20, default: 10 }),
  PASSWORD_MAX_ATTEMPT: t.Integer({ minimum: 1, maximum: 100, default: 5 }),
  PASSWORD_PEPPER: t.String(),
  PASSWORD_EXPIRED: t.RegExp(REGEX_TIME, { default: '180 days' }),
  PASSWORD_MIN_LENGTH: t.Integer({ minimum: 4, maximum: 128, default: 8 }),
  PASSWORD_REQUIRE_UPPERCASE: t.Boolean({ default: true }),
  PASSWORD_REQUIRE_LOWERCASE: t.Boolean({ default: true }),
  PASSWORD_REQUIRE_NUMBER: t.Boolean({ default: true }),
  PASSWORD_REQUIRE_SPECIAL_CHAR: t.Boolean({ default: true }),

  ENCRYPT_KEY: t.String(),
  ENCRYPT_IV: t.String(),

  S3_ENDPOINT: t.Optional(t.String()),
  S3_BUCKET: t.Optional(t.String()),
  S3_REGION: t.Optional(t.String()),
  S3_ACCESS_KEY: t.Optional(t.String()),
  S3_SECRET_KEY: t.Optional(t.String()),

  ENB_BULL_BOARD: t.Boolean({ default: true }),
  ENB_SWAGGER_UI: t.Boolean({ default: true }),

  AUTHOR_NAME: t.String({ default: 'AUTHOR_NAME' }),
  AUTHOR_URL: t.String({ default: 'https://example.com' }),
  AUTHOR_EMAIL: t.String({ default: 'example@gmail.com' }),
  LICENSE_NAME: t.String({ default: 'Apache 2.0' }),
  LICENSE_URL: t.String({
    default: 'https://www.apache.org/licenses/LICENSE-2.0',
  }),

  LOG_LEVEL: t.Enum(LOG_LEVEL, { default: LOG_LEVEL.INFO }),

  // OAuth
  TELEGRAM_BOT_TOKEN: t.Optional(t.String()),
  GOOGLE_CLIENT_ID: t.Optional(
    t.String({
      default:
        '19913563293-55a3511md6bs80cmusmjbtca9mvq6mch.apps.googleusercontent.com',
    }),
  ),

  MAIL_HOST: t.String({ minLength: 1 }),
  MAIL_PORT: t.Number({ minimum: 0, maximum: 65535, default: 465 }),
  MAIL_USER: t.String({ minLength: 1 }),
  MAIL_PASSWORD: t.String({ minLength: 1 }),
  MAIL_FROM: t.String({ minLength: 1 }),

  BACKEND_URL: t.String({ default: '' }),

  REGISTER_OTP_LIMIT: t.Number({ minimum: 1, maximum: 100, default: 5 }),
  REGISTER_RATE_LIMIT_MAX: t.Number({ minimum: 1, maximum: 100, default: 5 }),
  REGISTER_RATE_LIMIT_WINDOW_SECONDS: t.Number({
    minimum: 60,
    maximum: 3600,
    default: 900,
  }),

  LOGIN_RATE_LIMIT_MAX: t.Number({ minimum: 1, maximum: 100, default: 10 }),
  LOGIN_RATE_LIMIT_WINDOW_SECONDS: t.Number({
    minimum: 60,
    maximum: 3600,
    default: 900,
  }),

  AUDIT_LOG_FLUSH_INTERVAL_MS: t.Number({ minimum: 1000, default: 10_000 }),
});

const Compiler = TypeCompiler.Compile(envSchema);

const env = Value.Parse(
  ['Clone', 'Clean', 'Default', 'Decode', 'Convert'],
  envSchema,
  process.env,
) as Static<typeof envSchema>;

if (!Compiler.Check(env)) {
  const errors = [...Compiler.Errors(env)].reduce((errors, e) => {
    const path = e.path.substring(1);
    return { ...errors, [path]: e.message };
  }, {});
  console.error('❌ Invalid environment variables:', errors);
  process.exit(1);
}

export type IEnv = Static<typeof envSchema>;
export { env };
