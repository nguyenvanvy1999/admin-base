import process from 'node:process';
import { env } from 'src/config/env';
import { logger } from 'src/config/logger';
import type { IDownloadRes, IStorageBackend } from 'src/share';
import { FileStorageBackend, S3StorageBackend } from './storage';

export type StorageMode = 's3' | 'file';

export interface StorageStatus {
  mode: StorageMode;
  current: 's3' | 'file';
  s3EnvReady: boolean;
}

export interface StorageManagerOptions {
  mode?: StorageMode;
  backend?: IStorageBackend;
}

export class StorageManager implements IStorageBackend {
  private backend: IStorageBackend | null = null;
  private readonly mode: StorageMode;

  constructor(options?: StorageManagerOptions) {
    this.mode = options?.mode ?? 'file';
    if (options?.backend) {
      this.backend = options.backend;
    } else {
      this.backend = this.buildBackend(this.mode);
    }
  }

  private isClusterMode(): boolean {
    return env.ENB_CLUSTER && process.platform === 'linux';
  }

  private hasS3Env(): boolean {
    return Boolean(
      env.S3_ACCESS_KEY &&
        env.S3_BUCKET &&
        env.S3_ENDPOINT &&
        env.S3_SECRET_KEY,
    );
  }

  private buildBackendPreferS3(): IStorageBackend {
    try {
      const s3 = new S3StorageBackend();
      logger.info('Using S3StorageBackend');
      return s3;
    } catch (e) {
      logger.error(`S3StorageBackend failed: ${e}`);
      logger.info('Using FileStorageBackend');
      return new FileStorageBackend();
    }
  }

  private buildBackend(mode: StorageMode): IStorageBackend {
    const inCluster = this.isClusterMode();
    if (mode === 's3') return this.buildBackendPreferS3();
    if (inCluster) {
      throw new Error('Local file storage is not allowed in cluster mode');
    }
    return new FileStorageBackend();
  }

  getBackend(): IStorageBackend {
    if (this.backend) return this.backend;
    this.backend = this.buildBackend(this.mode);
    return this.backend;
  }

  getStatus(): StorageStatus {
    const backend = this.getBackend();
    const current = backend instanceof S3StorageBackend ? 's3' : 'file';
    return {
      mode: this.mode,
      current,
      s3EnvReady: this.hasS3Env(),
    };
  }

  upload(file: File): Promise<string> {
    return this.getBackend().upload(file);
  }

  download(filename: string): Promise<IDownloadRes> {
    return this.getBackend().download(filename);
  }
}

export const storageManager = new StorageManager();
