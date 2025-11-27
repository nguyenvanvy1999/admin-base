import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { TestLifecycle } from 'test/utils';

type EnvShape = Record<string, string | undefined>;

const ENV_MODULE_PATH = 'src/config/env';

function buildMinimalValidEnv(overrides: EnvShape = {}): EnvShape {
  return {
    APP_NAME: 'p2p-be',
    COMMIT_HASH: 'dev-hash',
    BUILD_DATE: `${Math.floor(Date.now() / 1000)}`,
    BUILD_NUMBER: '1',
    POSTGRESQL_URI: 'postgresql://user:pass@localhost:5432/db',
    JWT_ACCESS_TOKEN_SECRET_KEY: 'super-secret',
    SYSTEM_PASSWORD: 'system-password',
    ADMIN_PASSWORD: 'admin-password',
    PASSWORD_PEPPER: 'pepper',
    ENCRYPT_KEY: '0123456789abcdef0123456789abcdef',
    ENCRYPT_IV: '0123456789abcdef',
    MAIL_HOST: 'smtp.example.com',
    MAIL_USER: 'user@example.com',
    MAIL_PASSWORD: 'password',
    MAIL_FROM: 'noreply@example.com',
    ENB_CLUSTER: 'false',
    ...overrides,
  };
}

function withEnv(vars: EnvShape): void {
  // Clear potentially sticky vars first
  const keys = new Set<string>([
    ...Object.keys(process.env),
    ...Object.keys(vars),
  ]);
  for (const key of keys) delete (process.env as any)[key];
  for (const [k, v] of Object.entries(vars))
    if (v !== undefined) process.env[k] = v;
}

async function importEnvModule(): Promise<any> {
  const cacheBuster = `?t=${Math.random()}`;
  return await import(`${ENV_MODULE_PATH}${cacheBuster}`);
}

function stubExitAndError(): void {
  process.exit = mock((code?: number) => {
    throw new Error(`exit:${code}`);
  }) as unknown as typeof process.exit;
  console.error = mock(() => undefined) as unknown as typeof console.error;
}

function expectValidationFail(overrides?: EnvShape): void {
  if (overrides) withEnv(buildMinimalValidEnv(overrides));
  else withEnv({});
  stubExitAndError();
  expect(importEnvModule()).rejects.toThrow('exit:1');
}

describe('Environment Validation (src/config/env.ts)', () => {
  const originalExit = process.exit;
  const originalError = console.error;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    TestLifecycle.clearMock();
    // Restore original process methods
    process.exit = originalExit;
    console.error = originalError;

    // Restore original environment variables completely
    // Clear all current env vars first
    for (const key in process.env) {
      delete process.env[key];
    }
    // Restore original values
    Object.assign(process.env, originalEnv);
  });

  it('should load with minimal required vars and apply defaults', async () => {
    withEnv(buildMinimalValidEnv());
    const mod = await importEnvModule();
    const env = mod.env;

    expect(env.API_PREFIX).toBe('api');
    expect(env.REDIS_URI).toBe('redis://localhost:6379');
    expect(env.REDIS_RETRY).toBe(5);
    expect(env.ENB_SWAGGER_UI).toBe(true);
    expect(typeof env.LOG_LEVEL).toBe('string');
    expect(env.MAIL_PORT).toBe(465);
    expect(env.PORT).toBe(3000);
    expect(env.ENB_SEED).toBe(false);
    expect(env.ENB_HTTP_LOG).toBe(true);
    expect(env.REQ_BODY_MAX_SIZE_MB).toBe(256);
    expect(env.REQ_TIMEOUT_SECOND).toBe(10);
    expect(env.JWT_AUDIENCE).toBe('https://example.com');
    expect(env.JWT_ISSUER).toBe('admin');
    expect(env.JWT_SUBJECT).toBe('admin');
    expect(env.JWT_ACCESS_TOKEN_EXPIRED).toBe('15 minutes');
    expect(env.JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION).toBe('0 second');
    expect(env.JWT_REFRESH_TOKEN_EXPIRED).toBe('15 days');
    expect(env.SALT_LENGTH).toBe(10);
    expect(env.PASSWORD_MAX_ATTEMPT).toBe(5);
    expect(env.PASSWORD_EXPIRED).toBe('180 days');
    expect(env.AUTHOR_NAME).toBe('AUTHOR_NAME');
    expect(env.AUTHOR_URL).toBe('https://example.com');
    expect(env.AUTHOR_EMAIL).toBe('example@gmail.com');
    expect(env.LICENSE_NAME).toBe('Apache 2.0');
    expect(env.LICENSE_URL).toBe('https://www.apache.org/licenses/LICENSE-2.0');
    expect(env.BACKEND_URL).toBe('');
    expect(env.AUDIT_LOG_FLUSH_INTERVAL_MS).toBe(10_000);
    expect(env.ENB_CLUSTER).toBe(false);
  });

  it('should convert and respect overrides for numeric and enum-like vars', async () => {
    withEnv(
      buildMinimalValidEnv({
        PORT: '4000',
        REDIS_RETRY: '10',
        LOG_LEVEL: 'debug',
        API_PREFIX: 'v1',
        ENB_SEED: 'true',
        ENB_HTTP_LOG: 'false',
        REQ_BODY_MAX_SIZE_MB: '512',
        REQ_TIMEOUT_SECOND: '30',
        SALT_LENGTH: '12',
        PASSWORD_MAX_ATTEMPT: '10',
        MAIL_PORT: '587',
        AUDIT_LOG_FLUSH_INTERVAL_MS: '10000',
        ENB_CLUSTER: 'true',
      }),
    );
    const mod = await importEnvModule();
    const env = mod.env;
    expect(env.PORT).toBe(4000);
    expect(env.REDIS_RETRY).toBe(10);
    expect(env.LOG_LEVEL.toLowerCase()).toBe('debug');
    expect(env.API_PREFIX).toBe('v1');
    expect(env.ENB_SEED).toBe(true);
    expect(env.ENB_HTTP_LOG).toBe(false);
    expect(env.REQ_BODY_MAX_SIZE_MB).toBe(512);
    expect(env.REQ_TIMEOUT_SECOND).toBe(30);
    expect(env.SALT_LENGTH).toBe(12);
    expect(env.PASSWORD_MAX_ATTEMPT).toBe(10);
    expect(env.MAIL_PORT).toBe(587);
    expect(env.AUDIT_LOG_FLUSH_INTERVAL_MS).toBe(10000);
    expect(env.ENB_CLUSTER).toBe(true);
  });

  it('should accept ENB_CLUSTER as boolean', async () => {
    withEnv(
      buildMinimalValidEnv({
        ENB_CLUSTER: 'true',
      }),
    );
    const mod = await importEnvModule();
    expect(mod.env.ENB_CLUSTER).toBe(true);
  });

  it('should default ENB_CLUSTER to false when not provided', async () => {
    withEnv(buildMinimalValidEnv());
    const mod = await importEnvModule();
    expect(mod.env.ENB_CLUSTER).toBe(false);
  });

  it('should accept optional S3 config being undefined', async () => {
    withEnv(buildMinimalValidEnv());
    const mod = await importEnvModule();
    const env = mod.env as { S3_ENDPOINT?: string | undefined };
    expect(env.S3_ENDPOINT).toBeUndefined();
  });

  it('should validate regex for CORS_ALLOW_METHOD when provided', async () => {
    withEnv(
      buildMinimalValidEnv({
        CORS_ALLOW_METHOD: 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD',
      }),
    );
    const mod = await importEnvModule();
    expect(mod.env.CORS_ALLOW_METHOD).toBe(
      'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD',
    );
  });

  it('should coerce boolean strings and allow overriding ENB_SWAGGER_UI=false', async () => {
    withEnv(
      buildMinimalValidEnv({
        ENB_SWAGGER_UI: 'false',
      }),
    );
    const mod = await importEnvModule();
    expect(mod.env.ENB_SWAGGER_UI).toBe(false);
  });

  it('should expose defaults for CORS and audit-log settings', async () => {
    withEnv(buildMinimalValidEnv());
    const mod = await importEnvModule();
    const env = mod.env;
    expect(env.CORS_ALLOW_HEADERS).toBe('*');
    expect(env.CORS_ALLOW_ORIGIN).toBe('*');
    expect(env.AUDIT_LOG_FLUSH_INTERVAL_MS).toBe(10_000);
    expect(env.BACKEND_URL).toBe('');
  });

  it('should accept optional OAuth fields when provided', async () => {
    withEnv(
      buildMinimalValidEnv({
        TELEGRAM_BOT_TOKEN: 'token',
        GOOGLE_CLIENT_ID: 'client-id.apps.googleusercontent.com',
      }),
    );
    const mod = await importEnvModule();
    expect(mod.env.TELEGRAM_BOT_TOKEN).toBe('token');
    expect(mod.env.GOOGLE_CLIENT_ID).toBe(
      'client-id.apps.googleusercontent.com',
    );
  });

  it('should accept optional S3 config when provided', async () => {
    withEnv(
      buildMinimalValidEnv({
        S3_ENDPOINT: 'https://s3.amazonaws.com',
        S3_BUCKET: 'my-bucket',
        S3_REGION: 'us-east-1',
        S3_ACCESS_KEY: 'access-key',
        S3_SECRET_KEY: 'secret-key',
      }),
    );
    const mod = await importEnvModule();
    const env = mod.env;
    expect(env.S3_ENDPOINT).toBe('https://s3.amazonaws.com');
    expect(env.S3_BUCKET).toBe('my-bucket');
    expect(env.S3_REGION).toBe('us-east-1');
    expect(env.S3_ACCESS_KEY).toBe('access-key');
    expect(env.S3_SECRET_KEY).toBe('secret-key');
  });

  it('should accept JWT configuration overrides', async () => {
    withEnv(
      buildMinimalValidEnv({
        JWT_AUDIENCE: 'https://myapp.com',
        JWT_ISSUER: 'myapp',
        JWT_SUBJECT: 'user',
        JWT_ACCESS_TOKEN_EXPIRED: '30 minutes',
        JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: '5 minutes',
        JWT_REFRESH_TOKEN_EXPIRED: '30 days',
      }),
    );
    const mod = await importEnvModule();
    const env = mod.env;
    expect(env.JWT_AUDIENCE).toBe('https://myapp.com');
    expect(env.JWT_ISSUER).toBe('myapp');
    expect(env.JWT_SUBJECT).toBe('user');
    expect(env.JWT_ACCESS_TOKEN_EXPIRED).toBe('30 minutes');
    expect(env.JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION).toBe('5 minutes');
    expect(env.JWT_REFRESH_TOKEN_EXPIRED).toBe('30 days');
  });

  it('should accept author and license configuration overrides', async () => {
    withEnv(
      buildMinimalValidEnv({
        AUTHOR_NAME: 'John Doe',
        AUTHOR_URL: 'https://johndoe.com',
        AUTHOR_EMAIL: 'john@example.com',
        LICENSE_NAME: 'MIT',
        LICENSE_URL: 'https://opensource.org/licenses/MIT',
      }),
    );
    const mod = await importEnvModule();
    const env = mod.env;
    expect(env.AUTHOR_NAME).toBe('John Doe');
    expect(env.AUTHOR_URL).toBe('https://johndoe.com');
    expect(env.AUTHOR_EMAIL).toBe('john@example.com');
    expect(env.LICENSE_NAME).toBe('MIT');
    expect(env.LICENSE_URL).toBe('https://opensource.org/licenses/MIT');
  });

  it('should fail when BUILD_DATE is not an integer', () => {
    expectValidationFail({ BUILD_DATE: 'not-integer' });
  });

  it('should fail when LOG_LEVEL is invalid', () => {
    expectValidationFail({ LOG_LEVEL: 'verbose' });
  });

  it('should fail when SALT_LENGTH is below minimum', () => {
    expectValidationFail({ SALT_LENGTH: '2' });
  });

  it('should fail when PASSWORD_MAX_ATTEMPT is below minimum', () => {
    expectValidationFail({ PASSWORD_MAX_ATTEMPT: '0' });
  });

  it('should fail when MAIL_PORT is out of range', () => {
    expectValidationFail({ MAIL_PORT: '70000' });
  });

  it('should accept valid REGEX_TIME values for time-based fields', async () => {
    withEnv(
      buildMinimalValidEnv({
        JWT_ACCESS_TOKEN_EXPIRED: '30 minutes',
        JWT_REFRESH_TOKEN_EXPIRED: '7 days',
        JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: '5 minutes',
        PASSWORD_EXPIRED: '365 days',
      }),
    );
    const mod = await importEnvModule();
    expect(mod.env.JWT_ACCESS_TOKEN_EXPIRED).toBe('30 minutes');
    expect(mod.env.JWT_REFRESH_TOKEN_EXPIRED).toBe('7 days');
    expect(mod.env.JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION).toBe('5 minutes');
    expect(mod.env.PASSWORD_EXPIRED).toBe('365 days');
  });

  it('should fail when required fields are missing and call process.exit(1)', () => {
    withEnv({});
    stubExitAndError();
    expect(importEnvModule()).rejects.toThrow('exit:1');
  });

  it('should fail on invalid REGEX_TIME (e.g., JWT_ACCESS_TOKEN_EXPIRED)', () => {
    expectValidationFail({ JWT_ACCESS_TOKEN_EXPIRED: 'invalid-time' });
  });

  it('should fail when PORT is out of range', () => {
    expectValidationFail({ PORT: '70000' });
  });

  it('should fail when CORS_ALLOW_METHOD is invalid', () => {
    expectValidationFail({ CORS_ALLOW_METHOD: 'INVALID' });
  });

  it('should fail when REQ_BODY_MAX_SIZE_MB is negative', () => {
    expectValidationFail({ REQ_BODY_MAX_SIZE_MB: '-1' });
  });

  it('should fail when REQ_TIMEOUT_SECOND is negative', () => {
    expectValidationFail({ REQ_TIMEOUT_SECOND: '-1' });
  });

  it('should fail when AUDIT_LOG_FLUSH_INTERVAL_MS is below minimum', () => {
    expectValidationFail({ AUDIT_LOG_FLUSH_INTERVAL_MS: '0' });
  });

  it('should fail when JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION is invalid', () => {
    expectValidationFail({
      JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION: 'invalid-time',
    });
  });

  it('should fail when PASSWORD_EXPIRED is invalid', () => {
    expectValidationFail({ PASSWORD_EXPIRED: 'invalid-time' });
  });
});
