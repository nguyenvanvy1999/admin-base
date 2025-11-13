import { createCipheriv, createDecipheriv } from 'node:crypto';

const algorithm = 'aes-256-cbc';

export class EncryptService {
  private static hexToBuffer(hex: string): Buffer {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(clean, 'hex');
  }

  private static getKeyAndIv(): { key: Buffer; iv: Buffer } {
    const encryptKey =
      process.env.ENCRYPT_KEY ||
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const encryptIv = process.env.ENCRYPT_IV || '0123456789abcdef';
    const key = EncryptService.hexToBuffer(encryptKey);
    const iv = EncryptService.hexToBuffer(encryptIv);
    return { key, iv };
  }

  static aes256Encrypt(
    data: string | Record<string, any> | Record<string, any>[],
  ): string {
    const { key, iv } = EncryptService.getKeyAndIv();
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const cipher = createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return encrypted.toString('base64');
  }

  static aes256Decrypt<T>(encrypted: string): T {
    const { key, iv } = EncryptService.getKeyAndIv();
    const decipher = createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);
    const text = decrypted.toString('utf8');
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }
}
