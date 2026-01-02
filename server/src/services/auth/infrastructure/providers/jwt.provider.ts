import dayjs from 'dayjs';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { env, type IEnv } from 'src/config/env';
import {
  type EncryptService,
  encryptService,
} from 'src/services/auth/security/encrypt.service';
import type { IdUtil, IJwtVerified, ITokenPayload } from 'src/share';
import { ErrCode, idUtil, timeStringToSeconds, UnAuthErr } from 'src/share';
import type { ITokenService } from '../../domain/interfaces/token.service.interface';

export class JwtProvider implements ITokenService {
  constructor(
    private readonly e: IEnv = env,
    private readonly idGen: IdUtil = idUtil,
    private readonly encryptSvc: EncryptService = encryptService,
  ) {}

  signJwt(payload: Record<string, any>): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setNotBefore(this.e.JWT_ACCESS_TOKEN_NOT_BEFORE_EXPIRATION)
      .setExpirationTime(this.e.JWT_ACCESS_TOKEN_EXPIRED)
      .setAudience(this.e.JWT_AUDIENCE)
      .setIssuer(this.e.JWT_ISSUER)
      .setSubject(this.e.JWT_SUBJECT)
      .sign(new TextEncoder().encode(this.e.JWT_ACCESS_TOKEN_SECRET_KEY));
  }

  async verifyJwt(token: string): Promise<IJwtVerified | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.e.JWT_ACCESS_TOKEN_SECRET_KEY),
      );
      return payload as IJwtVerified;
    } catch {
      return null;
    }
  }

  createRefreshToken(): { refreshToken: string; expirationTime: Date } {
    const expiredAt = dayjs()
      .add(timeStringToSeconds(this.e.JWT_REFRESH_TOKEN_EXPIRED), 's')
      .toDate();
    return {
      refreshToken: this.idGen.token32(),
      expirationTime: expiredAt,
    };
  }

  async createAccessToken(
    payload: ITokenPayload,
  ): Promise<{ accessToken: string; expirationTime: Date }> {
    const data = this.encryptSvc.aes256Encrypt(payload);
    const accessToken = await this.signJwt({ data });
    return {
      accessToken,
      expirationTime: dayjs()
        .add(timeStringToSeconds(this.e.JWT_ACCESS_TOKEN_EXPIRED), 's')
        .toDate(),
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<JWTPayload & { data: ITokenPayload }> {
    const res = await this.verifyJwt(token);
    if (!res) {
      throw new UnAuthErr(ErrCode.InvalidToken);
    }
    const data = this.encryptSvc.aes256Decrypt<ITokenPayload>(res.data);
    return { ...res, data };
  }
}

export const jwtProvider = new JwtProvider();
