import { ServiceBase } from '@client/libs/ServiceBase';
import type { CurrentUserRes } from '@server/dto/user.dto';

export class UserService extends ServiceBase {
  constructor() {
    super('/api/users');
  }

  async getCurrentUser(): Promise<CurrentUserRes> {
    return this.get<CurrentUserRes>({
      endpoint: 'me',
    });
  }
}

export const userService = new UserService();
