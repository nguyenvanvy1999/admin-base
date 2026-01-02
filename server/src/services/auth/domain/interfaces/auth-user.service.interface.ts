import type { ICurrentUser } from 'src/share';

export interface IAuthUserService {
  loadUserWithPermissions(
    userId: string,
    options?: { checkStatus?: boolean },
  ): Promise<ICurrentUser>;
  loadUserForAuth(userId: string): Promise<{
    id: string;
    email: string | null;
    status: string;
    mfaTotpEnabled: boolean;
    totpSecret: string | null;
  }>;
}
