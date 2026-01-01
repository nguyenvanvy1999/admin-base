import { createCipheriv, createDecipheriv } from 'node:crypto';
import { env } from 'src/config/env';

const algorithm = 'aes-256-cbc';

export class EncryptService {
  hexToBuffer(hex: string): Buffer {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(clean, 'hex');
  }

  getKeyAndIv(): { key: Buffer; iv: Buffer } {
    const key = this.hexToBuffer(env.ENCRYPT_KEY);
    const iv = this.hexToBuffer(env.ENCRYPT_IV);
    return { key, iv };
  }

  aes256Encrypt(
    data: string | Record<string, any> | Record<string, any>[],
  ): string {
    const { key, iv } = this.getKeyAndIv();
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const cipher = createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return encrypted.toString('base64');
  }

  aes256Decrypt<T>(encrypted: string): T {
    const { key, iv } = this.getKeyAndIv();
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

export const encryptService = new EncryptService();
