import { appEnv, type IEnv } from '@server/configs/env';
import {
  ErrorCode,
  type ITokenPayload,
  TimeUtil,
  throwAppError,
} from '@server/share';
import dayjs from 'dayjs';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { EncryptService } from './encrypt.service';

export interface IJwtVerified extends JWTPayload {
  data: string;
}

export class TokenService {
  constructor(
    private readonly deps: {
      env: IEnv;
      timeUtil: TimeUtil;
      encrypt: EncryptService;
    } = {
      env: appEnv,
      timeUtil: new TimeUtil(),
      encrypt: new EncryptService(),
    },
  ) {}

  signJwt(payload: Record<string, any>): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.deps.env.JWT_ACCESS_TOKEN_EXPIRED)
      .setAudience(this.deps.env.JWT_AUDIENCE)
      .setIssuer(this.deps.env.JWT_ISSUER)
      .setSubject(this.deps.env.JWT_SUBJECT)
      .sign(new TextEncoder().encode(this.deps.env.JWT_SECRET));
  }

  async verifyJwt(token: string): Promise<IJwtVerified | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.deps.env.JWT_SECRET),
      );
      return payload as IJwtVerified;
    } catch {
      return null;
    }
  }

  createRefreshToken(): { refreshToken: string; expirationTime: Date } {
    const expiredSeconds = this.deps.timeUtil.parseTime(
      this.deps.env.JWT_REFRESH_TOKEN_EXPIRED,
    );
    const expiredAt = dayjs().add(expiredSeconds, 's').toDate();
    return {
      refreshToken: this.generateToken(32),
      expirationTime: expiredAt,
    };
  }

  private generateToken(length: number): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createAccessToken(
    payload: ITokenPayload,
  ): Promise<{ accessToken: string; expirationTime: Date }> {
    const data = this.deps.encrypt.aes256Encrypt(payload);
    const accessToken = await this.signJwt({ data });
    const expiredSeconds = this.deps.timeUtil.parseTime(
      this.deps.env.JWT_ACCESS_TOKEN_EXPIRED,
    );
    const expirationTime = dayjs().add(expiredSeconds, 's').toDate();
    return {
      accessToken,
      expirationTime,
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<JWTPayload & { data: ITokenPayload }> {
    const res = await this.verifyJwt(token);
    if (!res) {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Invalid token');
    }
    if (!res.data || typeof res.data !== 'string') {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Invalid token payload');
    }
    try {
      const data = this.deps.encrypt.aes256Decrypt<ITokenPayload>(res.data);
      return { ...res, data };
    } catch {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Failed to decrypt token');
    }
  }
}

export const tokenService = new TokenService();
