import { ServiceBase } from '@client/libs/ServiceBase';
import type { ILoginDto, LoginRes, RegisterRes } from '@server/dto/user.dto';

export class AuthService extends ServiceBase {
  constructor() {
    super('/api/users');
  }

  async login(data: ILoginDto): Promise<LoginRes> {
    return this.post<LoginRes>(data, {
      endpoint: 'login',
    });
  }

  async register(data: {
    username: string;
    password: string;
    name?: string;
  }): Promise<RegisterRes> {
    return this.post<RegisterRes>(data, {
      endpoint: 'register',
    });
  }
}

export const authService = new AuthService();
