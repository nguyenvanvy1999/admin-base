import path from 'node:path';
import { S3Client } from 'bun';
import { extension, lookup } from 'mime-types';
import { env } from 'src/config/env';
import { type ILogger, logger } from 'src/config/logger';
import {
  APP_ENV,
  BadReqErr,
  ErrCode,
  type IDownloadRes,
  IdUtil,
  type IStorageBackend,
} from 'src/share';

const sharedDeps = {
  pathUtil: {
    extname: path.extname,
    join: path.join,
  },
  mimeUtil: {
    lookup,
    extension,
  },
  idGenerator: {
    token16: IdUtil.token16,
  },
} as const;

export type IPathUtil = (typeof sharedDeps)['pathUtil'];
export type IMimeUtil = (typeof sharedDeps)['mimeUtil'];
export type IIdGenerator = (typeof sharedDeps)['idGenerator'];

export interface FileStorageDependencies {
  fileSystem: {
    write(
      destinationPath: string,
      data: File,
      options?: { createPath?: boolean },
    ): Promise<number>;
    file(filePath: string): {
      exists(): Promise<boolean>;
      arrayBuffer(): Promise<ArrayBuffer>;
    };
    pathToFileURL(path: string): URL;
  };
  pathUtil: IPathUtil;
  mimeUtil: IMimeUtil;
  idGenerator: IIdGenerator;
  imageDir: string;
}

export type IFileSystem = FileStorageDependencies['fileSystem'];

const fileStorageDeps = {
  ...sharedDeps,
  fileSystem: {
    write: Bun.write,
    file(filePath: string) {
      const file = Bun.file(filePath);
      return {
        exists() {
          return file.exists();
        },
        arrayBuffer() {
          return file.arrayBuffer();
        },
      };
    },
    pathToFileURL: Bun.pathToFileURL,
  },
  imageDir:
    env.APP_ENV === APP_ENV.PROD
      ? '/data/images'
      : Bun.pathToFileURL('tmp/images').pathname,
} as const satisfies FileStorageDependencies;

export interface S3StorageDependencies {
  pathUtil: IPathUtil;
  mimeUtil: IMimeUtil;
  idGenerator: IIdGenerator;
  s3Client?: S3Client;
  logger: ILogger;
  env: {
    S3_ACCESS_KEY?: string;
    S3_BUCKET?: string;
    S3_ENDPOINT?: string;
    S3_SECRET_KEY?: string;
    S3_REGION?: string;
  };
}

const s3StorageDeps = {
  ...sharedDeps,
  s3Client: (() => {
    if (
      !env.S3_ACCESS_KEY ||
      !env.S3_BUCKET ||
      !env.S3_ENDPOINT ||
      !env.S3_SECRET_KEY
    ) {
      logger.warning('Missing S3 configuration');
      return undefined;
    }
    return new S3Client({
      endpoint: env.S3_ENDPOINT,
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
      region: env.S3_REGION ?? 'default',
    });
  })(),
  logger,
  env: {
    S3_ACCESS_KEY: env.S3_ACCESS_KEY,
    S3_BUCKET: env.S3_BUCKET,
    S3_ENDPOINT: env.S3_ENDPOINT,
    S3_SECRET_KEY: env.S3_SECRET_KEY,
    S3_REGION: env.S3_REGION,
  },
} as const satisfies S3StorageDependencies;

export class FileStorageBackend implements IStorageBackend {
  constructor(
    private readonly deps: FileStorageDependencies = fileStorageDeps,
  ) {}

  async upload(file: File): Promise<string> {
    const ext = this.deps.pathUtil.extname(file.name) || '.bin';
    const fileName = `${this.deps.idGenerator.token16()}${ext}`;
    const destinationPath = `${this.deps.imageDir}/${fileName}`;
    await this.deps.fileSystem.write(destinationPath, file, {
      createPath: true,
    });
    return fileName;
  }

  async download(fileName: string): Promise<IDownloadRes> {
    const filePath = this.deps.pathUtil.join(this.deps.imageDir, fileName);
    const file = this.deps.fileSystem.file(filePath);
    if (!(await file.exists())) {
      throw new BadReqErr(ErrCode.InvalidFile);
    }
    const fileBlob = await file.arrayBuffer();
    const mime =
      this.deps.mimeUtil.lookup(fileName) || 'application/octet-stream';
    const ext = this.deps.mimeUtil.extension(mime) || 'bin';
    return {
      content: new Blob([fileBlob], { type: mime }),
      contentType: { mime, ext },
    };
  }
}

export class S3StorageBackend implements IStorageBackend {
  constructor(private readonly deps: S3StorageDependencies = s3StorageDeps) {}

  async upload(file: File): Promise<string> {
    if (!this.deps.s3Client) {
      throw new Error(
        'S3 client not initialized. Please check your S3 configuration.',
      );
    }
    const ext = this.deps.pathUtil.extname(file.name) || '.bin';
    const fileName = `${this.deps.idGenerator.token16()}${ext}`;
    const s3file = this.deps.s3Client.file(fileName);
    await s3file.write(file, { type: file.type });
    return fileName;
  }

  async download(fileName: string): Promise<IDownloadRes> {
    if (!this.deps.s3Client) {
      throw new Error(
        'S3 client not initialized. Please check your S3 configuration.',
      );
    }
    const s3file = this.deps.s3Client.file(fileName);
    if (!(await s3file.exists())) {
      throw new BadReqErr(ErrCode.InvalidFile);
    }
    const fileBlob = await s3file.arrayBuffer();
    const mime =
      this.deps.mimeUtil.lookup(fileName) || 'application/octet-stream';
    const ext = this.deps.mimeUtil.extension(mime) || 'bin';
    return {
      content: new Blob([fileBlob], { type: mime }),
      contentType: { mime, ext },
    };
  }
}
