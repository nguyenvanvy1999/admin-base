import type { currentUserCache } from 'src/config/cache';
import { container } from 'src/config/container';
import type { AuthUserService } from 'src/services/auth/core/auth-user.service';
import type { ctxStore, ICurrentUser } from 'src/share';
import type { TokenService } from './auth-util.service';

export class AuthMiddlewareService {
  constructor(
    private readonly deps: {
      tokenService: TokenService;
      authUserService: AuthUserService;
      currentUserCache: typeof currentUserCache;
      ctxStore: typeof ctxStore;
    },
  ) {}

  async authenticateFromToken(token: string): Promise<ICurrentUser> {
    const { data } = await this.deps.tokenService.verifyAccessToken(token);

    let currentUser: ICurrentUser;
    const cachedUser = await this.deps.currentUserCache.get(data.sessionId);

    if (cachedUser) {
      currentUser = cachedUser;
    } else {
      const user = await this.deps.authUserService.loadUserWithPermissions(
        data.userId,
      );
      currentUser = {
        ...user,
        sessionId: data.sessionId,
      };
      await this.deps.currentUserCache.set(data.sessionId, currentUser);
    }

    this.updateContext(currentUser);
    return currentUser;
  }

  private updateContext(currentUser: ICurrentUser): void {
    const current = this.deps.ctxStore.getStore();
    if (current) {
      current.userId = currentUser.id;
      current.sessionId = currentUser.sessionId;
    }
  }
}

export const authMiddlewareService = container.resolve<AuthMiddlewareService>(
  AuthMiddlewareService,
);
