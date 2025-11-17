import { config } from 'dotenv';
import { resolve } from 'path';

export class TestSetup {
  static setup(): void {
    // Load environment variables from .env file
    config({ path: resolve(process.cwd(), '.env') });

    const minimalEnvVars: Record<string, string> = {
      NODE_ENV: 'test',
      // Add other required environment variables for testing here
      // Use dummy values that are valid for the expected type
      PASSWORD_SALT: '10',
      PASSWORD_PEPPER: 'dummy_pepper_for_testing_purposes',
      JWT_SECRET: 'dummy_jwt_secret_for_testing',
      JWT_EXPIRES_IN: '1d',
      REDIS_URL: 'redis://localhost:6379',
      DATABASE_URL:
        process.env.DATABASE_URL ||
        'postgresql://user:password@localhost:5432/testdb?schema=public',
    };

    for (const [key, value] of Object.entries(minimalEnvVars)) {
      // Set the environment variable for the test process
      process.env[key] = value;
    }
  }
}
