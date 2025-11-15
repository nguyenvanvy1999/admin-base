import { appEnv, type IEnv } from '@server/configs/env';
import type { ITokenPayload } from '@server/share';
import { ErrorCode, throwAppError } from '@server/share';
import dayjs from 'dayjs';
import { type JWTPayload, jwtVerify, SignJWT } from 'jose';
import { EncryptService } from './encrypt.service';

export interface IJwtVerified extends JWTPayload {
  data: string;
}

export class TokenService {
  constructor(private readonly e: IEnv = appEnv) {}

  private parseTime(timeStr: string): number {
    const match = timeStr.match(
      /^(\d+)\s*(second|minute|hour|day|week|month|year)s?$/i,
    );
    if (!match) {
      return 15 * 60;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
      week: 604800,
      month: 2592000,
      year: 31536000,
    };
    return value * (multipliers[unit] || 60);
  }

  async signJwt(payload: Record<string, any>): Promise<string> {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.e.JWT_ACCESS_TOKEN_EXPIRED)
      .setAudience(this.e.JWT_AUDIENCE)
      .setIssuer(this.e.JWT_ISSUER)
      .setSubject(this.e.JWT_SUBJECT)
      .sign(new TextEncoder().encode(this.e.JWT_SECRET));
  }

  async verifyJwt(token: string): Promise<IJwtVerified | null> {
    try {
      const { payload } = await jwtVerify(
        token,
        new TextEncoder().encode(this.e.JWT_SECRET),
      );
      return payload as IJwtVerified;
    } catch {
      return null;
    }
  }

  createRefreshToken(): { refreshToken: string; expirationTime: Date } {
    const expiredSeconds = this.parseTime(this.e.JWT_REFRESH_TOKEN_EXPIRED);
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
    const data = EncryptService.aes256Encrypt(payload);
    const accessToken = await this.signJwt({ data });
    const expiredSeconds = this.parseTime(this.e.JWT_ACCESS_TOKEN_EXPIRED);
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
      const data = EncryptService.aes256Decrypt<ITokenPayload>(res.data);
      return { ...res, data };
    } catch {
      throwAppError(ErrorCode.INVALID_TOKEN, 'Failed to decrypt token');
    }
  }
}

export const tokenService = new TokenService();
