import { Elysia, t } from 'elysia';
import { registerOtpLimitCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { env } from 'src/config/env';
import { UserStatus } from 'src/generated';
import { OtpResDto } from 'src/modules/auth/dtos';
import { otpService } from 'src/service/auth/otp.service';
import {
  castToRes,
  DOC_TAG,
  ErrorResDto,
  PurposeVerify,
  ResWrapper,
} from 'src/share';

async function checkOtpConditions(
  user: {
    id: string;
    status: UserStatus;
    password: string | null;
    mfaTotpEnabled: boolean;
  },
  purpose: PurposeVerify,
): Promise<boolean> {
  switch (purpose) {
    case PurposeVerify.REGISTER: {
      // Limit check
      const limit = await registerOtpLimitCache.get(user.id);
      if (limit && limit >= env.REGISTER_OTP_LIMIT) {
        await db.user.update({
          where: { id: user.id },
          data: { status: UserStatus.suspendded },
          select: { id: true },
        });
        return false;
      }

      // Only send email if the user is INACTIVE
      return user.status === UserStatus.inactive;
    }

    case PurposeVerify.FORGOT_PASSWORD: {
      // Only send it if user has password
      return Boolean(user.password);
    }

    case PurposeVerify.RESET_MFA: {
      // Only send it if MFA is enabled
      return user.mfaTotpEnabled;
    }

    default:
      return false;
  }
}

async function updateRegisterOtpLimit(userId: string) {
  const current = await registerOtpLimitCache.get(userId);
  const nextValue = current ? current + 1 : 1;
  await registerOtpLimitCache.set(userId, nextValue);
}

// todo: audit log
export const otpController = new Elysia({
  prefix: '/auth/otp',
  tags: [DOC_TAG.AUTH],
}).post(
  '/',
  async ({ body: { email, purpose } }) => {
    email = email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, status: true, password: true, mfaTotpEnabled: true },
    });

    if (!user) return castToRes(null);

    // Check business rules
    const allowed = await checkOtpConditions(user, purpose);
    if (!allowed) return castToRes(null);

    // Send OTP
    const otpToken = await otpService.sendOtp(user.id, email, purpose);
    if (!otpToken) return castToRes(null);

    // Update register OTP limit
    if (purpose === PurposeVerify.REGISTER) {
      await updateRegisterOtpLimit(user.id);
    }

    return castToRes({ otpToken });
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
