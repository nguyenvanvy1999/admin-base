import type { JWTPayload } from 'jose';
import type { IJwtVerified, ITokenPayload } from 'src/share';

export interface ITokenService {
  signJwt(payload: Record<string, any>): Promise<string>;
  verifyJwt(token: string): Promise<IJwtVerified | null>;
  createRefreshToken(): { refreshToken: string; expirationTime: Date };
  createAccessToken(
    payload: ITokenPayload,
  ): Promise<{ accessToken: string; expirationTime: Date }>;
  verifyAccessToken(
    token: string,
  ): Promise<JWTPayload & { data: ITokenPayload }>;
}
