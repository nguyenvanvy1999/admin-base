import { LOG_LEVEL } from '@server/share/constants/log';
import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  LOG_LEVEL: z
    .enum([LOG_LEVEL.DEBUG, LOG_LEVEL.INFO, LOG_LEVEL.WARNING, LOG_LEVEL.ERROR])
    .default(LOG_LEVEL.INFO),
  POSTGRES_URL: z.string(),

  JWT_SECRET: z.string().default('secret'),
  JWT_ACCESS_TOKEN_EXPIRED: z.string().default('60 minutes'),
  JWT_REFRESH_TOKEN_EXPIRED: z.string().default('30 days'),
  JWT_AUDIENCE: z.string().default('https://example.com'),
  JWT_ISSUER: z.string().default('investment'),
  JWT_SUBJECT: z.string().default('investment'),

  ENCRYPT_KEY: z.string(),
  ENCRYPT_IV: z.string(),

  ENB_SWAGGER_UI: z.coerce.boolean().default(true).optional(),

  EXCHANGE_RATE_API_URL: z
    .string()
    .default('https://latest.currency-api.pages.dev/v1/currencies/vnd.min.json')
    .optional(),
  EXCHANGE_RATE_CACHE_TTL: z.coerce
    .number()
    .int()
    .min(0)
    .default(3600000)
    .optional(),

  REDIS_URI: z.string().default('redis://localhost:6379'),

  AUTO_SEED: z.coerce.boolean().default(true).optional(),
  AUTO_SEED_SUPER_ADMIN: z.coerce.boolean().default(true).optional(),

  SUPER_ADMIN_USERNAME: z.string().default('superadmin'),
  SUPER_ADMIN_PASSWORD: z.string(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues.reduce(
    (acc: Record<string, string>, e) => {
      const path = e.path.join('.');
      return { ...acc, [path]: e.message };
    },
    {},
  );
  console.error('❌ Invalid environment variables:', errors);
  process.exit(1);
}

export type IEnv = z.infer<typeof envSchema>;
export const appEnv = result.data;
