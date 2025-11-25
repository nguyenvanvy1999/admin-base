import { ServiceBase } from '@client/libs/ServiceBase';
import type { ILoginDto, LoginRes, RegisterRes } from '@server/dto/user.dto';

export class AuthService extends ServiceBase {
  constructor() {
    super('/api/users');
  }

  login(data: ILoginDto): Promise<LoginRes> {
    return this.post<LoginRes>(data, {
      endpoint: 'login',
    });
  }

  register(data: {
    username: string;
    password: string;
    name?: string;
    baseCurrencyId: string;
  }): Promise<RegisterRes> {
    return this.post<RegisterRes>(data, {
      endpoint: 'register',
    });
  }
}

export const authService = new AuthService();
