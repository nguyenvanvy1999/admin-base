import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  IUpsertUserDto,
  IUserStatisticsQueryDto,
  UserListResponse,
  UserStatisticsResponse,
} from '@server/dto/admin/user.dto';
import type {
  CurrentUserRes,
  IChangePasswordDto,
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

  changePassword(data: IChangePasswordDto): Promise<UpdateProfileRes> {
    return this.post<UpdateProfileRes>(data, {
      endpoint: 'change-password',
    });
  }

  listUsers(query?: {
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'username' | 'name' | 'role' | 'created';
    sortOrder?: 'asc' | 'desc';
  }): Promise<UserListResponse> {
    return this.get<UserListResponse>({
      endpoint: '/api/admin/users',
      params: query,
    });
  }

  createUser(data: Omit<IUpsertUserDto, 'id'>): Promise<null> {
    return this.post<null>(data, {
      endpoint: '/api/admin/users',
    });
  }

  updateUser(data: IUpsertUserDto): Promise<null> {
    return this.post<null>(data, {
      endpoint: '/api/admin/users',
    });
  }

  deleteManyUsers(ids: string[]): Promise<null> {
    return this.post<null>(
      { ids },
      {
        endpoint: '/api/admin/users/del',
      },
    );
  }

  getUserStatistics(
    query?: IUserStatisticsQueryDto,
  ): Promise<UserStatisticsResponse> {
    return this.get<UserStatisticsResponse>({
      endpoint: '/api/admin/users/statistics',
      params: query,
    });
  }
}

export const userService = new UserService();
