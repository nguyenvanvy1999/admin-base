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
import type { UserRole } from '@server/generated/browser-index';

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
    role?: UserRole[];
    page?: number;
    limit?: number;
    sortBy?: 'username' | 'name' | 'role' | 'createdAt';
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

  deleteUser(id: string): Promise<null> {
    return this.post<null>(
      { ids: [id] },
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
