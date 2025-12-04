import { describe, expect, it, mock } from 'bun:test';
import { adminSettingController } from './admin-setting.controller';

const mockExport = mock(() => Promise.resolve({ key: 'value' }));
const mockImport = mock(() => Promise.resolve({ imported: 1, errors: [] }));

mock.module('src/service/admin/setting-admin.service', () => ({
  settingAdminService: {
    export: mockExport,
    import: mockImport,
    list: mock(() => Promise.resolve([])),
  },
}));

// Mock authorization to always pass
mock.module('src/service/auth/authorization', () => ({
  authorize: () => (app: any) => app,
  has: () => () => true,
}));

describe('AdminSettingController', () => {
  it('GET /settings/export should return settings', async () => {
    const response = await adminSettingController.handle(
      new Request('http://localhost/settings/export'),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ key: 'value' });
    expect(mockExport).toHaveBeenCalled();
  });

  it('POST /settings/import should import settings', async () => {
    const response = await adminSettingController.handle(
      new Request('http://localhost/settings/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: 'newValue' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mockImport).toHaveBeenCalled();
  });
});
