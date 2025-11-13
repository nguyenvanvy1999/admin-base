export class TestSetup {
  static setup(): void {
    const minimalEnvVars: Record<string, string> = {
      NODE_ENV: 'test',
    };

    for (const [key, value] of Object.entries(minimalEnvVars)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
