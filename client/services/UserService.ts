import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  CurrentUserRes,
  IUpdateProfileDto,
  UpdateProfileRes,
} from '@server/dto/user.dto';

export class UserService extends ServiceBase {
  constructor() {
    super('/api/users');
  }

  getCurrentUser(): Promise<CurrentUserRes> {
    return this.get<CurrentUserRes>({
      endpoint: 'me',
    });
  }

  updateProfile(data: IUpdateProfileDto): Promise<UpdateProfileRes> {
    return this.put<UpdateProfileRes>(data, {
      endpoint: 'profile',
    });
  }
}

export const userService = new UserService();
