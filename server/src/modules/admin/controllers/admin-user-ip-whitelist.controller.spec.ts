import { describe, expect, it, mock } from 'bun:test';
import { Elysia } from 'elysia';
import { adminUserIpWhitelistController } from './admin-user-ip-whitelist.controller';

const mockList = mock(() =>
  Promise.resolve({
    docs: [{ id: '1', ip: '127.0.0.1', userId: 'user1', created: new Date() }],
    count: 1,
  }),
);
const mockDetail = mock(() =>
  Promise.resolve({
    id: '1',
    ip: '127.0.0.1',
    userId: 'user1',
    created: new Date(),
  }),
);
const mockUpsert = mock(() => Promise.resolve(null));
const mockRemoveMany = mock(() => Promise.resolve(null));

mock.module('src/service/admin/user-ip-whitelist-admin.service', () => ({
  userIpWhitelistAdminService: {
    list: mockList,
    detail: mockDetail,
    upsert: mockUpsert,
    removeMany: mockRemoveMany,
  },
}));

const mockCurrentUser = {
  id: 'test-user-id',
  permissions: ['IPWHITELIST.VIEW', 'IPWHITELIST.UPDATE'],
  sessionId: 'test-session-id',
  roleIds: [],
  email: 'test@example.com',
  status: 'active' as const,
};

mock.module('src/service/auth/auth.middleware', () => ({
  authCheck: (app: any) =>
    app.resolve({ as: 'local' }, () => ({
      currentUser: mockCurrentUser,
    })),
}));

mock.module('src/service/auth/authorization', () => ({
  authorize: () => (app: any) => app,
  has: () => () => true,
}));

const testApp = new Elysia()
  .resolve({ as: 'local' }, () => ({
    currentUser: mockCurrentUser,
  }))
  .use(adminUserIpWhitelistController);

describe('AdminUserIpWhitelistController', () => {
  it('GET /user-ip-whitelists/ should return list', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/user-ip-whitelists/'),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.docs).toHaveLength(1);
    expect(mockList).toHaveBeenCalled();
  });

  it('GET /user-ip-whitelists/:id should return detail', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/user-ip-whitelists/1'),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe('1');
    expect(mockDetail).toHaveBeenCalledWith('1');
  });

  it('POST /user-ip-whitelists/ should add IP', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/user-ip-whitelists/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user1',
          ip: '127.0.0.1',
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith({
      userId: 'user1',
      ip: '127.0.0.1',
    });
  });

  it('POST /user-ip-whitelists/del should remove IPs', async () => {
    const response = await testApp.handle(
      new Request('http://localhost/user-ip-whitelists/del', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: ['1', '2'] }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mockRemoveMany).toHaveBeenCalledWith(['1', '2']);
  });
});
