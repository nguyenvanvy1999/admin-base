import { describe, expect, it, mock } from 'bun:test';
import { adminUserIpWhitelistController } from './admin-user-ip-whitelist.controller';

const mockList = mock(() =>
  Promise.resolve([{ id: '1', ip: '127.0.0.1', created: new Date() }]),
);
const mockAdd = mock(() =>
  Promise.resolve({ id: '1', ip: '127.0.0.1', created: new Date() }),
);
const mockRemove = mock(() =>
  Promise.resolve({ id: '1', ip: '127.0.0.1', created: new Date() }),
);

mock.module('src/service/admin/user-ip-whitelist-admin.service', () => ({
  userIpWhitelistAdminService: {
    list: mockList,
    add: mockAdd,
    remove: mockRemove,
  },
}));

// Mock authorization to always pass
mock.module('src/service/auth/authorization', () => ({
  authorize: () => (app: any) => app,
  has: () => () => true,
}));

describe('AdminUserIpWhitelistController', () => {
  it('GET /users/:userId/ip-whitelist should return list', async () => {
    const response = await adminUserIpWhitelistController.handle(
      new Request('http://localhost/users/user1/ip-whitelist'),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(mockList).toHaveBeenCalledWith('user1');
  });

  it('POST /users/:userId/ip-whitelist should add IP', async () => {
    const response = await adminUserIpWhitelistController.handle(
      new Request('http://localhost/users/user1/ip-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: '127.0.0.1' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mockAdd).toHaveBeenCalledWith('user1', '127.0.0.1');
  });

  it('DELETE /users/:userId/ip-whitelist/:id should remove IP', async () => {
    const response = await adminUserIpWhitelistController.handle(
      new Request('http://localhost/users/user1/ip-whitelist/ip1', {
        method: 'DELETE',
      }),
    );
    expect(response.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith('user1', 'ip1');
  });
});
