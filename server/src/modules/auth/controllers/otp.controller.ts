import { Elysia, t } from 'elysia';
import { registerOtpLimitCache } from 'src/config/cache';
import { db } from 'src/config/db';
import { UserStatus } from 'src/generated';
import { OtpResDto } from 'src/modules/auth/dtos';
import { otpService } from 'src/service/auth/otp.service';
import { settingService } from 'src/service/misc/setting.service';
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
      const limit = await registerOtpLimitCache.get(user.id);
      const { otpLimit } = await settingService.registerRateLimit();
      if (limit && limit >= otpLimit) {
        await db.user.update({
          where: { id: user.id },
          data: { status: UserStatus.suspendded },
          select: { id: true },
        });
        return false;
      }

      return user.status === UserStatus.inactive;
    }

    case PurposeVerify.FORGOT_PASSWORD: {
      return Boolean(user.password);
    }

    case PurposeVerify.RESET_MFA: {
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

    const allowed = await checkOtpConditions(user, purpose);
    if (!allowed) return castToRes(null);

    const otpToken = await otpService.sendOtp(user.id, email, purpose);
    if (!otpToken) return castToRes(null);

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
