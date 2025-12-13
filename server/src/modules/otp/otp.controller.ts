import { Elysia, t } from 'elysia';
import { OtpResDto } from 'src/dtos/auth.dto';
import { otpService } from 'src/service/auth/otp.service';
import {
  castToRes,
  DOC_TAG,
  ErrorResDto,
  PurposeVerify,
  ResWrapper,
} from 'src/share';

export const otpController = new Elysia({
  prefix: '/auth/otp',
  tags: [DOC_TAG.AUTH],
}).post(
  '/',
  async ({ body: { email, purpose } }) => {
    const result = await otpService.sendOtpWithAudit(email, purpose);
    return castToRes(result);
  },
  {
    body: t.Object({
      email: t.String({ format: 'email', minLength: 1 }),
      purpose: t.Enum(PurposeVerify),
    }),
    detail: {
      description:
        'Send OTP via email for: verify email, forgot password, reset MFA...',
      summary: 'Send OTP email by purpose',
    },
    response: {
      200: ResWrapper(OtpResDto),
      400: ErrorResDto,
      500: ErrorResDto,
    },
  },
);
