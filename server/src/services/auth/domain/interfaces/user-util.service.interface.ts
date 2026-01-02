import type { ILoginRes } from 'src/dtos/auth.dto';
import type { User } from 'src/generated';
import type { SecurityDeviceInsight, UPermission } from 'src/share';

export interface IUserUtilService {
  getActiveRoleIds(userId: string): Promise<string[]>;
  getPermissions(
    user: { id: string },
    activeRoleIds?: string[],
  ): Promise<UPermission[]>;
  completeLogin(
    user: Pick<
      User,
      'id' | 'email' | 'status' | 'created' | 'modified' | 'mfaTotpEnabled'
    > & { roles: { roleId: string }[] },
    clientIp: string,
    userAgent: string,
    security?: SecurityDeviceInsight,
  ): Promise<ILoginRes>;
  findUserForLogin(email: string): Promise<{
    id: string;
    email: string | null;
    password: string;
    status: string;
    passwordAttempt: number;
    passwordExpired: Date | null;
    mfaTotpEnabled: boolean;
    totpSecret: string | null;
    created: Date;
    modified: Date;
    roles: { roleId: string }[];
    mfaEnrollRequired: boolean;
  }>;
  createUser(email: string, password: string): Promise<string>;
}
