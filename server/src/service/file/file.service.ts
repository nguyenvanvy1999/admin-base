import { type StorageManager, storageManager } from 'src/service/file';
import type { IDownloadRes } from 'src/share';

export class FileService {
  constructor(
    private readonly deps: {
      storageManager: StorageManager;
    } = {
      storageManager,
    },
  ) {}

  uploadFile(file: File): Promise<string> {
    return this.deps.storageManager.upload(file);
  }

  downloadFile(filename: string): Promise<IDownloadRes> {
    return this.deps.storageManager.download(filename);
  }

  getStorageStatus() {
    return this.deps.storageManager.getStatus();
  }
}

export const fileService = new FileService();
