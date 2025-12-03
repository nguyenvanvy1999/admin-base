import { mock } from 'bun:test';
import type { S3Client } from 'bun';
import type {
  FileStorageDependencies,
  IFileSystem,
  IIdGenerator,
  IMimeUtil,
  IPathUtil,
  S3StorageDependencies,
} from 'src/service/file/storage';

export class StorageFixtures {
  static createMockFile(
    options: { name?: string; type?: string; content?: string } = {},
  ): File {
    const name = options.name || 'test-file.jpg';
    const type = options.type || 'image/jpeg';
    const content = options.content || 'test file content';
    return new File([content], name, { type });
  }

  static createSampleArrayBuffer(): ArrayBuffer {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    return buffer.buffer;
  }

  static createMockPathUtil(): IPathUtil {
    return {
      extname: mock((filePath: string) => {
        const match = filePath.match(/\.([^.]+)$/);
        return match ? `.${match[1]}` : '';
      }),
      join: mock((...paths: string[]) => paths.join('/')),
    };
  }

  static createMockMimeUtil(): IMimeUtil {
    return {
      lookup: mock((fileName: string) => {
        const mimeMap: Record<string, string> = {
          'test.jpg': 'image/jpeg',
          'test.png': 'image/png',
          'test.pdf': 'application/pdf',
          'test.txt': 'text/plain',
          'test.bin': 'application/octet-stream',
        };
        const ext = fileName.split('.').pop() || '';
        return mimeMap[`test.${ext}`] || false;
      }),
      extension: mock((mimeType: string) => {
        const extMap: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'application/pdf': 'pdf',
          'text/plain': 'txt',
          'application/octet-stream': 'bin',
        };
        return extMap[mimeType] || false;
      }),
    };
  }

  static createMockIdGenerator(): IIdGenerator {
    let counter = 0;
    return {
      token16: mock((prefix?: string) => {
        counter += 1;
        const token = `token${counter.toString().padStart(16, '0')}`;
        return prefix ? `${prefix}_${token}` : token;
      }),
    };
  }

  static createMockFileSystem(): IFileSystem {
    const fileStore = new Map<string, ArrayBuffer>();
    return {
      write: mock(
        async (
          destinationPath: string,
          data: File,
          _options?: { createPath?: boolean },
        ) => {
          const arrayBuffer = await data.arrayBuffer();
          fileStore.set(destinationPath, arrayBuffer);
          return arrayBuffer.byteLength;
        },
      ),
      file: mock((filePath: string) => {
        return {
          exists: mock(async () => fileStore.has(filePath)),
          arrayBuffer: mock(() => {
            const buffer = fileStore.get(filePath);
            if (!buffer) {
              throw new Error('File not found');
            }
            return Promise.resolve(buffer);
          }),
        };
      }),
      pathToFileURL: mock((path: string) => {
        return new URL(`file://${path}`);
      }),
    };
  }

  static createMockS3Client(): S3Client {
    const fileStore = new Map<string, ArrayBuffer>();
    const fileMocks = new Map<
      string,
      {
        write: ReturnType<typeof mock>;
        exists: ReturnType<typeof mock>;
        arrayBuffer: ReturnType<typeof mock>;
      }
    >();

    return {
      file: mock((fileName: string) => {
        if (!fileMocks.has(fileName)) {
          fileMocks.set(fileName, {
            write: mock(async (file: File, _options?: { type?: string }) => {
              const arrayBuffer = await file.arrayBuffer();
              fileStore.set(fileName, arrayBuffer);
            }),
            exists: mock(() => {
              return Promise.resolve(fileStore.has(fileName));
            }),
            arrayBuffer: mock(() => {
              const buffer = fileStore.get(fileName);
              if (!buffer) {
                throw new Error('File not found');
              }
              return Promise.resolve(buffer);
            }),
          });
        }
        return fileMocks.get(fileName)!;
      }),
    } as unknown as S3Client;
  }

  static createFileStorageDependencies(
    overrides: Partial<FileStorageDependencies> = {},
  ): FileStorageDependencies {
    return {
      pathUtil: overrides.pathUtil || StorageFixtures.createMockPathUtil(),
      mimeUtil: overrides.mimeUtil || StorageFixtures.createMockMimeUtil(),
      idGenerator:
        overrides.idGenerator || StorageFixtures.createMockIdGenerator(),
      fileSystem:
        overrides.fileSystem || StorageFixtures.createMockFileSystem(),
      imageDir: overrides.imageDir || '/tmp/test-images',
    };
  }

  static createS3StorageDependencies(
    overrides: Partial<S3StorageDependencies> = {},
  ): S3StorageDependencies {
    return {
      pathUtil: overrides.pathUtil || StorageFixtures.createMockPathUtil(),
      mimeUtil: overrides.mimeUtil || StorageFixtures.createMockMimeUtil(),
      idGenerator:
        overrides.idGenerator || StorageFixtures.createMockIdGenerator(),
      s3Client: overrides.s3Client || StorageFixtures.createMockS3Client(),
      logger:
        overrides.logger ||
        ({
          info: mock(),
          warning: mock(),
          error: mock(),
          debug: mock(),
          trace: mock(),
          fatal: mock(),
        } as any),
      env: overrides.env || {
        S3_ACCESS_KEY: 'test-key',
        S3_SECRET_KEY: 'test-secret',
        S3_ENDPOINT: 'http://localhost:9000',
        S3_BUCKET: 'test-bucket',
        S3_REGION: 'us-east-1',
      },
    };
  }
}
