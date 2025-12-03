import { createDecipheriv } from 'node:crypto';
import { env, SQL } from 'bun';

interface BootstrapOptions {
  databaseUri?: string;
  onError?: 'exit' | 'warn' | 'retry';
  retryAttempts?: number;
  retryDelay?: number;
  skipSecretDecryption?: boolean;
}

interface SettingRecord {
  key: string;
  value: string;
  is_secret: boolean;
}

async function loadSettingsFromDatabase(
  databaseUri: string,
): Promise<SettingRecord[]> {
  const db = new SQL(databaseUri);

  try {
    return db<SettingRecord[]>`
        SELECT key, value, is_secret
        FROM settings
      `.execute();
  } finally {
    await db.close();
  }
}

function decryptSecretValue(encryptedValue: string): string {
  const encryptKey = env['ENCRYPT_KEY'];
  const encryptIv = env['ENCRYPT_IV'];

  if (!encryptKey || !encryptIv) {
    throw new Error(
      'ENCRYPT_KEY and ENCRYPT_IV must be available in env to decrypt secret settings',
    );
  }

  function hexToBuffer(hex: string): Buffer {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    return Buffer.from(clean, 'hex');
  }

  const algorithm = 'aes-256-cbc';
  const key = hexToBuffer(encryptKey);
  const iv = hexToBuffer(encryptIv);
  const decipher = createDecipheriv(algorithm, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64')),
    decipher.final(),
  ]);
  const text = decrypted.toString('utf8');

  try {
    const parsed = JSON.parse(text);
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
  } catch {
    return text;
  }
}

function assignSettingsToEnv(settings: SettingRecord[]): void {
  for (const setting of settings) {
    if (setting.is_secret) {
      try {
        env[setting.key] = decryptSecretValue(setting.value);
      } catch (error) {
        console.warn(
          `⚠️  Failed to decrypt secret setting "${setting.key}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      env[setting.key] = setting.value;
    }
  }
}

async function retryWithDelay<T>(
  fn: () => Promise<T>,
  attempts: number,
  delayMs: number,
): Promise<T> {
  let lastError: Error | unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        console.log(
          `⏳ Retry attempt ${i + 1}/${attempts} after ${delayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
}

export async function bootstrapSettings(
  options: BootstrapOptions = {},
): Promise<void> {
  const enablePreload = env['ENB_SETTINGS_PRELOAD'];

  if (enablePreload === 'false' || enablePreload === '0') {
    console.log('ℹ️  Settings preload is disabled (ENB_SETTINGS_PRELOAD=false)');
    return;
  }

  const {
    databaseUri,
    onError = 'exit',
    retryAttempts = 1,
    retryDelay = 1000,
    skipSecretDecryption = false,
  } = options;

  const uri = databaseUri || env['POSTGRESQL_URI'];

  if (!uri) {
    const error = 'POSTGRESQL_URI is required in env or bootstrap options';
    console.error(`❌ ${error}`);
    if (onError === 'exit') {
      process.exit(1);
    }
    throw new Error(error);
  }

  const loadWithRetry = async () => {
    try {
      console.log('🔄 Loading settings from database...');
      const settings = await loadSettingsFromDatabase(uri);

      if (settings.length === 0) {
        console.log('ℹ️  No settings found in database');
        return;
      }

      console.log(`✅ Loaded ${settings.length} settings from database`);

      if (skipSecretDecryption) {
        console.log('⚠️  Skipping secret decryption');
        const nonSecretSettings = settings.filter((s) => !s.is_secret);
        assignSettingsToEnv(nonSecretSettings);
      } else {
        assignSettingsToEnv(settings);
      }

      console.log('✅ Settings assigned to env');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`❌ Failed to load settings: ${errorMessage}`);
      if (errorStack) {
        console.error(`Stack: ${errorStack}`);
      }

      if (onError === 'exit') {
        process.exit(1);
      }
      if (onError === 'retry') {
        throw error;
      }
    }
  };

  if (onError === 'retry' && retryAttempts > 1) {
    await retryWithDelay(loadWithRetry, retryAttempts, retryDelay);
  } else {
    await loadWithRetry();
  }
}
