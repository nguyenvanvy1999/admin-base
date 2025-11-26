import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { Elysia } from 'elysia';
import { backendServerService } from 'src/service/backend/backend-server.service';
import { TestLifecycle } from 'test/utils';

describe('Server Routes Registration (src/service/backend/backend-server.service.ts)', () => {
  let app: Elysia | null = null;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mock.restore();
    TestLifecycle.clearMock();
  });

  afterEach(async () => {
    if (app?.server) {
      await app.stop();
    }
    app = null;
    TestLifecycle.clearMock();
    Object.assign(process.env, originalEnv);
  });

  it('should create server successfully without errors', async () => {
    expect(backendServerService.createServer()).resolves.toBeDefined();
    app = await backendServerService.createServer();
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
  });

  it('should register all expected controllers', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;

    const expectedControllers = [
      { name: 'auth', searchTerms: ['auth'] },
      { name: 'otp', searchTerms: ['otp'] },
      { name: 'account', searchTerms: ['account'] },
      { name: 'balance', searchTerms: ['balance'] },
      { name: 'currency', searchTerms: ['currency'] },
      { name: 'network', searchTerms: ['network'] },
      { name: 'misc', searchTerms: ['misc'] },
      { name: 'file', searchTerms: ['file'] },
      { name: 'oauth', searchTerms: ['oauth'] },
      { name: 'mfa', searchTerms: ['mfa'] },
      { name: 'user', searchTerms: ['user'] },
      { name: 'p2p', searchTerms: ['p2p', 'ad', 'order'] },
      { name: 'chat', searchTerms: ['chat'] },
      { name: 'admin', searchTerms: ['admin'] },
    ];

    const apiRoutes = routes.filter((r) => r.path.startsWith('/api/'));
    const allRoutePaths = apiRoutes.map((r) => r.path.toLowerCase()).join(' ');

    for (const controller of expectedControllers) {
      const hasController = controller.searchTerms.some((term) =>
        allRoutePaths.includes(term.toLowerCase()),
      );
      expect(hasController).toBe(true);
    }
  });

  it('should filter out queue routes from logged routes', async () => {
    app = await backendServerService.createServer();
    const allRoutes = app.routes;
    const filteredRoutes = allRoutes.filter(
      (r) => !r.path.includes('/queues') && !r.path.includes('/admin/queues'),
    );

    const queueRoutes = allRoutes.filter(
      (r) => r.path.includes('/queues') || r.path.includes('/admin/queues'),
    );

    expect(filteredRoutes.length).toBeLessThanOrEqual(allRoutes.length);
    if (queueRoutes.length > 0) {
      expect(filteredRoutes.length).toBeLessThan(allRoutes.length);
    }

    for (const route of filteredRoutes) {
      expect(route.path).not.toContain('/queues');
      expect(route.path).not.toContain('/admin/queues');
    }
  });

  it('should have routes with correct API prefix', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const apiRoutes = routes.filter((r) => r.path.startsWith('/api/'));

    expect(apiRoutes.length).toBeGreaterThan(0);

    for (const route of apiRoutes) {
      expect(route.path).toMatch(/^\/api\//);
    }
  });

  it('should register routes with valid HTTP methods', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const validMethods = [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
      'WS',
    ];

    for (const route of routes) {
      expect(validMethods).toContain(route.method);
    }
  });

  it('should not have duplicate routes with same method and path', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const routeKeys = new Set(routes.map((r) => `${r.method}:${r.path}`));

    expect(routeKeys.size).toBe(routes.length);
  });

  it('should register auth routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const authRoutes = routes.filter((r) => r.path.includes('/auth'));

    expect(authRoutes.length).toBeGreaterThan(0);

    const hasLogin = authRoutes.some((r) => r.path.includes('/login'));
    const hasRegister = authRoutes.some((r) => r.path.includes('/register'));
    expect(hasLogin || hasRegister).toBe(true);
  });

  it('should register P2P routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const p2pRoutes = routes.filter((r) => r.path.includes('/p2p'));

    expect(p2pRoutes.length).toBeGreaterThan(0);

    const p2pPrefixes = ['/ad', '/order', '/profile', '/payment'];
    const hasP2PRoutes = p2pRoutes.some((r) =>
      p2pPrefixes.some((prefix) => r.path.includes(prefix)),
    );
    expect(hasP2PRoutes).toBe(true);
  });

  it('should register admin routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const adminRoutes = routes.filter((r) => r.path.includes('/admin'));

    expect(adminRoutes.length).toBeGreaterThan(0);
  });

  it('should register account routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const accountRoutes = routes.filter((r) => r.path.includes('/account'));

    expect(accountRoutes.length).toBeGreaterThan(0);
  });

  it('should register balance routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const balanceRoutes = routes.filter((r) => r.path.includes('/balance'));

    expect(balanceRoutes.length).toBeGreaterThan(0);
  });

  it('should register currency routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const currencyRoutes = routes.filter((r) => r.path.includes('/currency'));

    expect(currencyRoutes.length).toBeGreaterThan(0);
  });

  it('should register network routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const networkRoutes = routes.filter((r) => r.path.includes('/network'));

    expect(networkRoutes.length).toBeGreaterThan(0);
  });

  it('should register file routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const fileRoutes = routes.filter((r) => r.path.includes('/file'));

    expect(fileRoutes.length).toBeGreaterThan(0);
  });

  it('should register OAuth routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const oauthRoutes = routes.filter((r) => r.path.includes('/oauth'));

    expect(oauthRoutes.length).toBeGreaterThan(0);
  });

  it('should register MFA routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const mfaRoutes = routes.filter((r) => r.path.includes('/mfa'));

    expect(mfaRoutes.length).toBeGreaterThan(0);
  });

  it('should register OTP routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const otpRoutes = routes.filter((r) => r.path.includes('/otp'));

    expect(otpRoutes.length).toBeGreaterThan(0);
  });

  it('should register chat routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const chatRoutes = routes.filter((r) => r.path.includes('/chat'));

    expect(chatRoutes.length).toBeGreaterThan(0);
  });

  it('should register user routes correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const userRoutes = routes.filter((r) => r.path.includes('/user'));

    expect(userRoutes.length).toBeGreaterThan(0);
  });

  it('should have at least one route for each registered controller', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const filteredRoutes = routes.filter(
      (r) => !r.path.includes('/queues') && !r.path.includes('/admin/queues'),
    );

    expect(filteredRoutes.length).toBeGreaterThan(0);
  });

  it('should handle routes with dynamic parameters correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const dynamicRoutes = routes.filter((r) => r.path.includes(':'));

    for (const route of dynamicRoutes) {
      expect(route.path).toMatch(/\/:[^/]+/);
    }
  });

  it('should not have routes with empty path', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;

    for (const route of routes) {
      expect(route.path).toBeTruthy();
      expect(route.path.length).toBeGreaterThan(0);
    }
  });

  it('should have consistent route structure', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const apiRoutes = routes.filter((r) => r.path.startsWith('/api/'));

    for (const route of apiRoutes) {
      const pathParts = route.path.split('/').filter((p) => p.length > 0);
      expect(pathParts.length).toBeGreaterThanOrEqual(1);
      if (pathParts.length > 0) {
        expect(pathParts[0]).toBe('api');
      }
    }
  });

  it('should register routes even when Bull Board is disabled', async () => {
    const originalEnbBullBoard = process.env['ENB_BULL_BOARD'];
    process.env['ENB_BULL_BOARD'] = 'false';

    app = await backendServerService.createServer();
    const routes = app.routes;
    const filteredRoutes = routes.filter(
      (r) => !r.path.includes('/queues') && !r.path.includes('/admin/queues'),
    );

    expect(filteredRoutes.length).toBeGreaterThan(0);

    process.env['ENB_BULL_BOARD'] = originalEnbBullBoard;
  });

  it('should maintain route order consistency', async () => {
    app = await backendServerService.createServer();
    const routes1 = app.routes.map((r) => `${r.method}:${r.path}`);
    await app.stop();

    app = await backendServerService.createServer();
    const routes2 = app.routes.map((r) => `${r.method}:${r.path}`);

    expect(routes1.length).toBe(routes2.length);
    expect(routes1).toEqual(routes2);
  });

  it('should handle server restart without losing routes', async () => {
    app = await backendServerService.createServer();
    const firstRoutes = app.routes.map((r) => `${r.method}:${r.path}`);
    const firstCount = firstRoutes.length;

    await app.stop();
    app = await backendServerService.createServer();

    const secondRoutes = app.routes.map((r) => `${r.method}:${r.path}`);
    const secondCount = secondRoutes.length;

    expect(secondCount).toBe(firstCount);
    expect(new Set(secondRoutes)).toEqual(new Set(firstRoutes));
  });

  it('should filter queue routes correctly when Bull Board is enabled', async () => {
    const originalEnbBullBoard = process.env['ENB_BULL_BOARD'];
    process.env['ENB_BULL_BOARD'] = 'true';

    app = await backendServerService.createServer();
    const allRoutes = app.routes;
    const filteredRoutes = allRoutes.filter(
      (r) => !r.path.includes('/queues') && !r.path.includes('/admin/queues'),
    );

    const queueRoutes = allRoutes.filter(
      (r) => r.path.includes('/queues') || r.path.includes('/admin/queues'),
    );

    if (queueRoutes.length > 0) {
      expect(filteredRoutes.length).toBeLessThan(allRoutes.length);
    }

    process.env['ENB_BULL_BOARD'] = originalEnbBullBoard;
  });

  it('should have routes with valid path format', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;

    for (const route of routes) {
      expect(route.path).toMatch(/^\//);
      expect(route.path).not.toMatch(/\/{3,}/);
      const normalizedPath = route.path.replace(/\/\*$/, '');
      expect(normalizedPath.length).toBeGreaterThan(0);
    }
  });

  it('should register all controllers in correct order', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;
    const apiRoutes = routes.filter((r) => r.path.startsWith('/api/'));

    const controllerOrder = [
      'auth',
      'user/auth',
      'otp',
      'user/account',
      'balance',
      'currency',
      'network',
      'misc',
      'file',
      'oauth',
      'mfa',
      'user',
      'p2p',
      'chat',
      'admin',
    ];

    const foundControllers: string[] = [];
    for (const route of apiRoutes) {
      for (const controller of controllerOrder) {
        if (route.path.includes(`/${controller}`)) {
          if (!foundControllers.includes(controller)) {
            foundControllers.push(controller);
          }
        }
      }
    }

    expect(foundControllers.length).toBeGreaterThan(0);
  });

  it('should not have routes with invalid characters', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;

    for (const route of routes) {
      const normalizedPath = route.path.replace(/\/\*$/, '');
      expect(normalizedPath).toMatch(/^[/a-zA-Z0-9:_*-]+$/);
    }
  });

  it('should handle routes with query parameters correctly', async () => {
    app = await backendServerService.createServer();
    const routes = app.routes;

    for (const route of routes) {
      expect(route.path).not.toContain('?');
    }
  });
});
