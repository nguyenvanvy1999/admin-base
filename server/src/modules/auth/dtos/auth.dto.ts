import { t } from 'elysia';

export const OtpResDto = t.Union([
  t.Null(),
  t.Object({ otpToken: t.String() }),
]);
