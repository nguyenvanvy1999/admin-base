import { beforeEach, describe, expect, it, mock } from 'bun:test';
import {
  FileStorageBackend,
  type FileStorageDependencies,
  S3StorageBackend,
  type S3StorageDependencies,
} from 'src/services/file/storage';
import { BadReqErr } from 'src/share';
import { StorageFixtures } from 'test/fixtures';

type MockedDeps = {
  extname: ReturnType<typeof mock>;
  token16: ReturnType<typeof mock>;
  lookup: ReturnType<typeof mock>;
  extension: ReturnType<typeof mock>;
};

function setupUploadMocks(
  deps: FileStorageDependencies | S3StorageDependencies,
  ext: string,
  token: string,
): MockedDeps {
  const extname = deps.pathUtil.extname as ReturnType<typeof mock>;
  const token16 = deps.idGenerator.token16 as ReturnType<typeof mock>;
  extname.mockReturnValue(ext);
  token16.mockReturnValue(token);
  return { extname, token16, lookup: mock(), extension: mock() };
}

function setupDownloadMocks(
  deps: FileStorageDependencies,
  _fileName: string,
  fileContent: ArrayBuffer,
  mime: string | false,
  ext: string | false,
) {
  const mockFile = deps.fileSystem.file as ReturnType<typeof mock>;
  const mockExists = mock(() => Promise.resolve(true));
  const mockArrayBuffer = mock(() => Promise.resolve(fileContent));
  const mockLookup = deps.mimeUtil.lookup as ReturnType<typeof mock>;
  const mockExtension = deps.mimeUtil.extension as ReturnType<typeof mock>;

  mockFile.mockReturnValue({
    exists: mockExists,
    arrayBuffer: mockArrayBuffer,
  });
  mockLookup.mockReturnValue(mime);
  mockExtension.mockReturnValue(ext);

  return { mockFile, mockExists, mockArrayBuffer, mockLookup, mockExtension };
}

describe('FileStorageBackend', () => {
  let fileStorageBackend: FileStorageBackend;
  let mockDeps: FileStorageDependencies;

  beforeEach(() => {
    mockDeps = StorageFixtures.createFileStorageDependencies();
    fileStorageBackend = new FileStorageBackend(mockDeps);
  });

  describe('upload', () => {
    it('should successfully upload file with extension', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockWrite = mockDeps.fileSystem.write as ReturnType<typeof mock>;
      const { extname, token16 } = setupUploadMocks(
        mockDeps,
        '.jpg',
        'token00000000000001',
      );

      const result = await fileStorageBackend.upload(file);

      expect(result).toBe('token00000000000001.jpg');
      expect(extname).toHaveBeenCalledWith('photo.jpg');
      expect(token16).toHaveBeenCalledTimes(1);
      expect(mockWrite).toHaveBeenCalledWith(
        '/tmp/test-images/token00000000000001.jpg',
        file,
        { createPath: true },
      );
    });

    it('should handle file without extension and fallback to bin', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo',
        type: 'application/octet-stream',
      });
      const mockWrite = mockDeps.fileSystem.write as ReturnType<typeof mock>;
      setupUploadMocks(mockDeps, '', 'token00000000000001');

      const result = await fileStorageBackend.upload(file);

      expect(result).toBe('token00000000000001.bin');
      expect(mockWrite).toHaveBeenCalledWith(
        '/tmp/test-images/token00000000000001.bin',
        file,
        { createPath: true },
      );
    });

    it('should generate unique file names using idGenerator', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const token16 = mockDeps.idGenerator.token16 as ReturnType<typeof mock>;
      const extname = mockDeps.pathUtil.extname as ReturnType<typeof mock>;

      extname.mockReturnValue('.jpg');
      token16
        .mockReturnValueOnce('token00000000000001')
        .mockReturnValueOnce('token00000000000002');

      const result1 = await fileStorageBackend.upload(file);
      const result2 = await fileStorageBackend.upload(file);

      expect(result1).toBe('token00000000000001.jpg');
      expect(result2).toBe('token00000000000002.jpg');
      expect(result1).not.toBe(result2);
      expect(token16).toHaveBeenCalledTimes(2);
      expect(extname).toHaveBeenCalledWith('photo.jpg');
    });

    it('should use correct imageDir from dependencies', async () => {
      const customImageDir = '/custom/images';
      const customDeps = StorageFixtures.createFileStorageDependencies({
        imageDir: customImageDir,
      });
      const customBackend = new FileStorageBackend(customDeps);
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockWrite = customDeps.fileSystem.write as ReturnType<typeof mock>;
      setupUploadMocks(customDeps, '.jpg', 'token00000000000001');

      await customBackend.upload(file);

      expect(mockWrite).toHaveBeenCalledWith(
        '/custom/images/token00000000000001.jpg',
        file,
        { createPath: true },
      );
    });

    it('should create directory path when needed', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockWrite = mockDeps.fileSystem.write as ReturnType<typeof mock>;
      setupUploadMocks(mockDeps, '.jpg', 'token00000000000001');

      await fileStorageBackend.upload(file);

      expect(mockWrite).toHaveBeenCalledWith(expect.any(String), file, {
        createPath: true,
      });
    });

    it('should handle fileSystem.write errors', () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockWrite = mockDeps.fileSystem.write as ReturnType<typeof mock>;
      setupUploadMocks(mockDeps, '.jpg', 'token00000000000001');
      mockWrite.mockRejectedValue(new Error('Disk full'));

      expect(fileStorageBackend.upload(file)).rejects.toThrow('Disk full');
    });

    it.each([
      { name: 'file.xyz', ext: '.xyz', expected: 'token00000000000001.xyz' },
      {
        name: 'a'.repeat(200) + '.jpg',
        ext: '.jpg',
        expected: 'token00000000000001.jpg',
      },
      {
        name: 'test-file@2024#1.jpg',
        ext: '.jpg',
        expected: 'token00000000000001.jpg',
      },
    ])('should handle file with $name', async ({ name, ext, expected }) => {
      const file = StorageFixtures.createMockFile({
        name,
        type: 'application/octet-stream',
      });
      setupUploadMocks(mockDeps, ext, 'token00000000000001');

      const result = await fileStorageBackend.upload(file);

      expect(result).toBe(expected);
    });
  });

  describe('download', () => {
    it('should successfully download existing file', async () => {
      const fileName = 'photo.jpg';
      const fileContent = StorageFixtures.createSampleArrayBuffer();
      const { mockExists, mockArrayBuffer } = setupDownloadMocks(
        mockDeps,
        fileName,
        fileContent,
        'image/jpeg',
        'jpg',
      );

      const result = await fileStorageBackend.download(fileName);

      expect(result.content).toBeInstanceOf(Blob);
      expect(result.content.type).toBe('image/jpeg');
      expect(result.contentType).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
      expect(mockExists).toHaveBeenCalledTimes(1);
      expect(mockArrayBuffer).toHaveBeenCalledTimes(1);
    });

    it('should throw BadReqErr with ErrCode.InvalidFile when file does not exist', () => {
      const fileName = 'nonexistent.jpg';
      const mockFile = mockDeps.fileSystem.file as ReturnType<typeof mock>;
      const mockExists = mock(() => Promise.resolve(false));
      mockFile.mockReturnValue({
        exists: mockExists,
        arrayBuffer: mock(),
      });

      expect(fileStorageBackend.download(fileName)).rejects.toThrow(BadReqErr);
      expect(mockExists).toHaveBeenCalled();
    });

    it('should handle MIME lookup fallback to application/octet-stream', async () => {
      const fileName = 'unknown.xyz';
      const fileContent = StorageFixtures.createSampleArrayBuffer();
      const { mockLookup } = setupDownloadMocks(
        mockDeps,
        fileName,
        fileContent,
        false,
        'bin',
      );

      const result = await fileStorageBackend.download(fileName);

      expect(result.content.type).toBe('application/octet-stream');
      expect(result.contentType.mime).toBe('application/octet-stream');
      expect(mockLookup).toHaveBeenCalledWith('unknown.xyz');
    });

    it('should handle extension fallback to bin when MIME extension not found', async () => {
      const fileName = 'photo.jpg';
      const fileContent = StorageFixtures.createSampleArrayBuffer();
      const { mockExtension } = setupDownloadMocks(
        mockDeps,
        fileName,
        fileContent,
        'unknown/mime-type',
        false,
      );

      const result = await fileStorageBackend.download(fileName);

      expect(result.contentType.ext).toBe('bin');
      expect(mockExtension).toHaveBeenCalledWith('unknown/mime-type');
    });

    it('should use correct file path joining logic', async () => {
      const fileName = 'photo.jpg';
      const customImageDir = '/custom/images';
      const customDeps = StorageFixtures.createFileStorageDependencies({
        imageDir: customImageDir,
      });
      const customBackend = new FileStorageBackend(customDeps);
      const fileContent = StorageFixtures.createSampleArrayBuffer();
      const mockJoin = customDeps.pathUtil.join as ReturnType<typeof mock>;
      setupDownloadMocks(
        customDeps,
        fileName,
        fileContent,
        'image/jpeg',
        'jpg',
      );
      mockJoin.mockReturnValue('/custom/images/photo.jpg');

      await customBackend.download(fileName);

      expect(mockJoin).toHaveBeenCalledWith(customImageDir, fileName);
    });

    it.each([
      {
        fileName: 'document.pdf',
        mime: 'application/pdf',
        ext: 'pdf',
      },
      {
        fileName: 'image.png',
        mime: 'image/png',
        ext: 'png',
      },
    ])('should return correct Blob for $fileName', async ({
      fileName,
      mime,
      ext,
    }) => {
      const fileContent = StorageFixtures.createSampleArrayBuffer();
      setupDownloadMocks(mockDeps, fileName, fileContent, mime, ext);

      const result = await fileStorageBackend.download(fileName);

      expect(result.content).toBeInstanceOf(Blob);
      expect(result.content.type).toBe(mime);
      expect(result.contentType).toEqual({ mime, ext });
    });
  });
});

describe('S3StorageBackend', () => {
  let s3StorageBackend: S3StorageBackend;
  let mockDeps: S3StorageDependencies;

  beforeEach(() => {
    mockDeps = StorageFixtures.createS3StorageDependencies();
    s3StorageBackend = new S3StorageBackend(mockDeps);
  });

  describe('upload', () => {
    it('should successfully upload file when S3 client is initialized', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockS3Client = mockDeps.s3Client;
      const { extname, token16 } = setupUploadMocks(
        mockDeps,
        '.jpg',
        'token00000000000001',
      );

      const result = await s3StorageBackend.upload(file);

      expect(result).toBe('token00000000000001.jpg');
      expect(extname).toHaveBeenCalledWith('photo.jpg');
      expect(token16).toHaveBeenCalledTimes(1);
      expect(mockS3Client?.file).toHaveBeenCalledWith(
        'token00000000000001.jpg',
      );
      const s3File = mockS3Client?.file('token00000000000001.jpg');
      expect(s3File?.write).toHaveBeenCalledWith(file, {
        type: 'image/jpeg',
      });
    });

    it('should handle file without extension and fallback to bin', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo',
        type: 'application/octet-stream',
      });
      const mockS3Client = mockDeps.s3Client;
      setupUploadMocks(mockDeps, '', 'token00000000000001');

      const result = await s3StorageBackend.upload(file);

      expect(result).toBe('token00000000000001.bin');
      expect(mockS3Client?.file).toHaveBeenCalledWith(
        'token00000000000001.bin',
      );
    });

    it('should generate unique file names using idGenerator', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const token16 = mockDeps.idGenerator.token16 as ReturnType<typeof mock>;
      const extname = mockDeps.pathUtil.extname as ReturnType<typeof mock>;

      extname.mockReturnValue('.jpg');
      token16
        .mockReturnValueOnce('token00000000000001')
        .mockReturnValueOnce('token00000000000002');

      const result1 = await s3StorageBackend.upload(file);
      const result2 = await s3StorageBackend.upload(file);

      expect(result1).toBe('token00000000000001.jpg');
      expect(result2).toBe('token00000000000002.jpg');
      expect(result1).not.toBe(result2);
      expect(token16).toHaveBeenCalledTimes(2);
    });

    it('should throw error when S3 client is not initialized', () => {
      const depsWithoutS3: S3StorageDependencies = {
        ...StorageFixtures.createS3StorageDependencies(),
        s3Client: undefined,
      };
      const backendWithoutS3 = new S3StorageBackend(depsWithoutS3);
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      expect(backendWithoutS3.upload(file)).rejects.toThrow(
        'S3 client not initialized. Please check your S3 configuration.',
      );
    });

    it('should call s3Client.file().write() with correct parameters', async () => {
      const file = StorageFixtures.createMockFile({
        name: 'document.pdf',
        type: 'application/pdf',
      });
      const mockS3Client = mockDeps.s3Client;
      setupUploadMocks(mockDeps, '.pdf', 'token00000000000001');

      await s3StorageBackend.upload(file);

      const s3File = mockS3Client?.file('token00000000000001.pdf');
      expect(s3File?.write).toHaveBeenCalledWith(file, {
        type: 'application/pdf',
      });
      expect(s3File?.write).toHaveBeenCalledTimes(1);
    });

    it('should handle S3 write errors', () => {
      const file = StorageFixtures.createMockFile({
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
      const mockS3Client = mockDeps.s3Client;
      const writeError = new Error('S3 upload failed');
      setupUploadMocks(mockDeps, '.jpg', 'token00000000000001');
      const s3File = mockS3Client?.file('token00000000000001.jpg');
      if (s3File) {
        s3File.write = mock(() => Promise.reject(writeError));
      }

      expect(s3StorageBackend.upload(file)).rejects.toThrow('S3 upload failed');
    });
  });

  describe('download', () => {
    async function uploadAndSetupMocks(
      fileName: string,
      mime: string | false,
      ext: string | false,
    ) {
      const file = StorageFixtures.createMockFile({
        name: fileName,
        type: typeof mime === 'string' ? mime : 'application/octet-stream',
      });
      const token16 = mockDeps.idGenerator.token16 as ReturnType<typeof mock>;
      const extname = mockDeps.pathUtil.extname as ReturnType<typeof mock>;

      extname.mockReturnValue('.' + (ext || 'bin'));
      token16.mockReturnValue('token00000000000001');

      await s3StorageBackend.upload(file);

      const mockLookup = mockDeps.mimeUtil.lookup as ReturnType<typeof mock>;
      const mockExtension = mockDeps.mimeUtil.extension as ReturnType<
        typeof mock
      >;

      mockLookup.mockReturnValue(mime);
      mockExtension.mockReturnValue(ext);

      return {
        mockLookup,
        mockExtension,
        uploadedFileName: 'token00000000000001.' + (ext || 'bin'),
      };
    }

    it('should successfully download existing file from S3', async () => {
      const fileName = 'photo.jpg';
      const { uploadedFileName } = await uploadAndSetupMocks(
        fileName,
        'image/jpeg',
        'jpg',
      );
      const mockS3Client = mockDeps.s3Client;

      const result = await s3StorageBackend.download(uploadedFileName);

      expect(result.content).toBeInstanceOf(Blob);
      expect(result.content.type).toBe('image/jpeg');
      expect(result.contentType).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
      expect(mockS3Client?.file).toHaveBeenCalledWith(uploadedFileName);
      const s3File = mockS3Client?.file(uploadedFileName);
      expect(s3File?.exists).toHaveBeenCalledTimes(1);
      expect(s3File?.arrayBuffer).toHaveBeenCalledTimes(1);
    });

    it('should throw BadReqErr with ErrCode.InvalidFile when file does not exist', () => {
      const fileName = 'nonexistent.jpg';
      const mockS3Client = mockDeps.s3Client;
      const s3File = mockS3Client?.file(fileName);

      expect(s3StorageBackend.download(fileName)).rejects.toThrow(BadReqErr);
      expect(s3File?.exists).toHaveBeenCalled();
      expect(s3File?.arrayBuffer).not.toHaveBeenCalled();
    });

    it('should throw error when S3 client is not initialized', () => {
      const depsWithoutS3: S3StorageDependencies = {
        ...StorageFixtures.createS3StorageDependencies(),
        s3Client: undefined,
      };
      const backendWithoutS3 = new S3StorageBackend(depsWithoutS3);
      const fileName = 'photo.jpg';

      expect(backendWithoutS3.download(fileName)).rejects.toThrow(
        'S3 client not initialized. Please check your S3 configuration.',
      );
    });

    it('should handle MIME lookup fallback to application/octet-stream', async () => {
      const fileName = 'unknown.xyz';
      const { mockLookup, uploadedFileName } = await uploadAndSetupMocks(
        fileName,
        false,
        'bin',
      );

      const result = await s3StorageBackend.download(uploadedFileName);

      expect(result.content.type).toBe('application/octet-stream');
      expect(result.contentType.mime).toBe('application/octet-stream');
      expect(mockLookup).toHaveBeenCalledWith(uploadedFileName);
    });

    it('should handle extension fallback to bin when MIME extension not found', async () => {
      const fileName = 'photo.jpg';
      const { mockExtension, uploadedFileName } = await uploadAndSetupMocks(
        fileName,
        'unknown/mime-type',
        false,
      );

      const result = await s3StorageBackend.download(uploadedFileName);

      expect(result.contentType.ext).toBe('bin');
      expect(mockExtension).toHaveBeenCalledWith('unknown/mime-type');
    });

    it.each([
      {
        fileName: 'document.pdf',
        mime: 'application/pdf',
        ext: 'pdf',
      },
      {
        fileName: 'image.png',
        mime: 'image/png',
        ext: 'png',
      },
    ])('should return correct Blob for $fileName', async ({
      fileName,
      mime,
      ext,
    }) => {
      const { uploadedFileName } = await uploadAndSetupMocks(
        fileName,
        mime,
        ext,
      );

      const result = await s3StorageBackend.download(uploadedFileName);

      expect(result.content).toBeInstanceOf(Blob);
      expect(result.content.type).toBe(mime);
      expect(result.contentType).toEqual({ mime, ext });
    });

    it('should handle different file types correctly', async () => {
      const testCases = [
        {
          fileName: 'image.jpg',
          mime: 'image/jpeg',
          ext: 'jpg',
          token: 'token00000000000001',
        },
        {
          fileName: 'image.png',
          mime: 'image/png',
          ext: 'png',
          token: 'token00000000000002',
        },
        {
          fileName: 'document.pdf',
          mime: 'application/pdf',
          ext: 'pdf',
          token: 'token00000000000003',
        },
        {
          fileName: 'text.txt',
          mime: 'text/plain',
          ext: 'txt',
          token: 'token00000000000004',
        },
      ];

      for (const testCase of testCases) {
        const file = StorageFixtures.createMockFile({
          name: testCase.fileName,
          type: testCase.mime,
        });
        const token16 = mockDeps.idGenerator.token16 as ReturnType<typeof mock>;
        const extname = mockDeps.pathUtil.extname as ReturnType<typeof mock>;

        extname.mockReturnValue('.' + testCase.ext);
        token16.mockReturnValue(testCase.token);

        const uploadedFileName = await s3StorageBackend.upload(file);
        expect(uploadedFileName).toBe(testCase.token + '.' + testCase.ext);

        const mockLookup = mockDeps.mimeUtil.lookup as ReturnType<typeof mock>;
        const mockExtension = mockDeps.mimeUtil.extension as ReturnType<
          typeof mock
        >;

        mockLookup.mockReturnValue(testCase.mime);
        mockExtension.mockReturnValue(testCase.ext);

        const result = await s3StorageBackend.download(uploadedFileName);

        expect(result.content.type).toContain(testCase.mime);
        expect(result.contentType.mime).toBe(testCase.mime);
        expect(result.contentType.ext).toBe(testCase.ext);
      }
    });

    it('should handle S3 arrayBuffer errors', async () => {
      const fileName = 'photo.jpg';
      const file = StorageFixtures.createMockFile({
        name: fileName,
        type: 'image/jpeg',
      });
      const mockS3Client = mockDeps.s3Client;
      const readError = new Error('S3 read failed');
      const token16 = mockDeps.idGenerator.token16 as ReturnType<typeof mock>;
      const extname = mockDeps.pathUtil.extname as ReturnType<typeof mock>;

      extname.mockReturnValue('.jpg');
      token16.mockReturnValue('token00000000000001');

      const uploadedFileName = await s3StorageBackend.upload(file);

      const s3File = mockS3Client?.file(uploadedFileName);
      if (s3File) {
        s3File.arrayBuffer = mock(() => Promise.reject(readError));
      }
      expect(s3StorageBackend.download(uploadedFileName)).rejects.toThrow(
        'S3 read failed',
      );
    });
  });
});
