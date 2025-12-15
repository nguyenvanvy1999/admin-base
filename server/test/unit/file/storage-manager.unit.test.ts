import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { StorageManager } from 'src/services/file';
import {
  FileStorageBackend,
  S3StorageBackend,
} from 'src/services/file/storage';
import type { IStorageBackend } from 'src/share';
import { StorageFixtures } from 'test/fixtures';
import { createMockFullEnv } from 'test/utils/mocks/env';

function createMockBackend(): IStorageBackend {
  return {
    upload: mock(() => Promise.resolve('mock-filename.jpg')),
    download: mock(() =>
      Promise.resolve({
        content: new Blob(['test']),
        contentType: { mime: 'image/jpeg', ext: 'jpg' },
      }),
    ),
  };
}

function setupS3EnvMock(hasEnv: boolean) {
  mock.module('src/config/env', () => {
    const mockEnv = createMockFullEnv(
      hasEnv
        ? {
            S3_ACCESS_KEY: 'test-key',
            S3_SECRET_KEY: 'test-secret',
            S3_ENDPOINT: 'http://localhost:9000',
            S3_BUCKET: 'test-bucket',
            S3_REGION: 'us-east-1',
          }
        : {},
    );
    return { env: mockEnv };
  });
}

describe('StorageManager', () => {
  beforeEach(() => {
    mock.restore();
  });

  describe('constructor', () => {
    it('should create instance with default mode file', () => {
      setupS3EnvMock(false);
      const manager = new StorageManager();
      expect(manager.getBackend()).toBeInstanceOf(FileStorageBackend);
    });

    it('should create instance with file mode', () => {
      setupS3EnvMock(false);
      const manager = new StorageManager({ mode: 'file' });
      expect(manager.getBackend()).toBeInstanceOf(FileStorageBackend);
    });

    it('should create instance with s3 mode when S3 env available', () => {
      setupS3EnvMock(true);
      const manager = new StorageManager({ mode: 's3' });
      expect(manager.getBackend()).toBeInstanceOf(S3StorageBackend);
    });

    it('should accept injected backend for testing', () => {
      setupS3EnvMock(false);
      const mockBackend = createMockBackend();
      const manager = new StorageManager({ backend: mockBackend });
      expect(manager.getBackend()).toBe(mockBackend);
    });

    it('should prefer injected backend over mode', () => {
      setupS3EnvMock(true);
      const mockBackend = createMockBackend();
      const manager = new StorageManager({
        mode: 's3',
        backend: mockBackend,
      });
      expect(manager.getBackend()).toBe(mockBackend);
    });

    it('should handle S3 mode when S3 env is partially missing', () => {
      setupS3EnvMock(false);
      const manager = new StorageManager({ mode: 's3' });
      expect(manager.getBackend()).toBeInstanceOf(S3StorageBackend);
    });
  });

  describe('getBackend', () => {
    it('should return cached backend on subsequent calls', () => {
      setupS3EnvMock(false);
      const manager = new StorageManager();
      const backend1 = manager.getBackend();
      const backend2 = manager.getBackend();
      expect(backend1).toBe(backend2);
    });
  });

  describe('getStatus', () => {
    it('should return status with file backend', () => {
      setupS3EnvMock(false);
      const manager = new StorageManager({ mode: 'file' });
      const status = manager.getStatus();

      expect(status.mode).toBe('file');
      expect(status.current).toBe('file');
      expect(status.s3EnvReady).toBe(false);
    });

    it('should return status with s3 backend', () => {
      setupS3EnvMock(true);
      const manager = new StorageManager({ mode: 's3' });
      const status = manager.getStatus();

      expect(status.mode).toBe('s3');
      expect(status.current).toBe('s3');
      expect(status.s3EnvReady).toBe(true);
    });
  });

  describe('immutability at runtime', () => {
    it('should not expose runtime mode switching', () => {
      setupS3EnvMock(true);
      const manager = new StorageManager({ mode: 'file' });
      expect((manager as any).setMode).toBeUndefined();
      const backend1 = manager.getBackend();
      const backend2 = manager.getBackend();
      expect(backend1).toBe(backend2);
    });
  });

  describe('cluster mode restrictions', () => {
    it('should throw when mode=file in production (cluster) without S3 env', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      mock.module('src/config/env', () => {
        const mockEnv = createMockFullEnv({ ENB_CLUSTER: true });
        return { env: mockEnv };
      });

      try {
        expect(() => new StorageManager({ mode: 'file' })).toThrow(
          /Local file storage is not allowed in cluster mode/,
        );
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });

    it('should use S3 when in production (cluster) with S3 env', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        configurable: true,
      });

      mock.module('src/config/env', () => {
        const mockEnv = createMockFullEnv({
          ENB_CLUSTER: true,
          S3_ACCESS_KEY: 'test-key',
          S3_SECRET_KEY: 'test-secret',
          S3_ENDPOINT: 'http://localhost:9000',
          S3_BUCKET: 'test-bucket',
          S3_REGION: 'us-east-1',
        });
        return { env: mockEnv };
      });

      try {
        const manager = new StorageManager({ mode: 's3' });
        expect(manager.getBackend()).toBeInstanceOf(S3StorageBackend);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });

    it('should allow file mode when ENB_CLUSTER is false', () => {
      setupS3EnvMock(false);
      mock.module('src/config/env', () => {
        const mockEnv = createMockFullEnv({ ENB_CLUSTER: false });
        return { env: mockEnv };
      });
      const manager = new StorageManager({ mode: 'file' });
      expect(manager.getBackend()).toBeInstanceOf(FileStorageBackend);
    });

    it('should allow file mode when not on linux platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true,
      });

      mock.module('src/config/env', () => {
        const mockEnv = createMockFullEnv({ ENB_CLUSTER: true });
        return { env: mockEnv };
      });

      try {
        const manager = new StorageManager({ mode: 'file' });
        expect(manager.getBackend()).toBeInstanceOf(FileStorageBackend);
      } finally {
        Object.defineProperty(process, 'platform', {
          value: originalPlatform,
          configurable: true,
        });
      }
    });
  });

  describe('upload', () => {
    it('should delegate upload to backend', async () => {
      setupS3EnvMock(false);
      const mockBackend = createMockBackend();
      const manager = new StorageManager({ backend: mockBackend });
      const file = StorageFixtures.createMockFile({ name: 'test.jpg' });

      const result = await manager.upload(file);

      expect(result).toBe('mock-filename.jpg');
      expect(mockBackend.upload).toHaveBeenCalledWith(file);
    });
  });

  describe('download', () => {
    it('should delegate download to backend', async () => {
      setupS3EnvMock(false);
      const mockBackend = createMockBackend();
      const manager = new StorageManager({ backend: mockBackend });
      const filename = 'test.jpg';

      const result = await manager.download(filename);

      expect(result.content).toBeInstanceOf(Blob);
      expect(result.contentType).toEqual({
        mime: 'image/jpeg',
        ext: 'jpg',
      });
      expect(mockBackend.download).toHaveBeenCalledWith(filename);
    });
  });
});
