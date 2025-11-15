export type UPermission = string;

export interface ITokenPayload {
  userId: string;
  timestamp: number;
  sessionId: string;
  clientIp: string;
  userAgent: string;
}

export interface ICurrentUser {
  id: string;
  sessionId: string;
  username: string;
  name: string | null;
  created: Date;
  modified: Date;
  baseCurrencyId: string | null;
  settings: any;
  permissions: UPermission[];
  roleIds: string[];
}

export type AppAuthMeta = {
  derive: { currentUser: ICurrentUser };
  decorator: Record<string, unknown>;
  store: Record<string, unknown>;
  resolve: Record<string, unknown>;
};
