import { ServiceBase } from '@client/libs/ServiceBase';
import type {
  CurrentUserRes,
  IUpdateProfileDto,
  UpdateProfileRes,
} from '@server/dto/user.dto';
import type { UserRole } from '@server/generated/prisma/enums';
import type {
  IUpsertUserDto,
  UserListResponse,
  UserResponse,
} from '@server/modules/admin/dtos/user.dto';

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

  getUser(id: string): Promise<UserResponse> {
    return this.get<UserResponse>({
      endpoint: `/api/admin/users/${id}`,
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

  deleteManyUsers(ids: string[]): Promise<null> {
    return this.post<null>(
      { ids },
      {
        endpoint: '/api/admin/users/del',
      },
    );
  }
}

export const userService = new UserService();
