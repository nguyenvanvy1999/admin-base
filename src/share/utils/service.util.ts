import { type ErrorCode, throwAppError } from '../constants/error';

/**
 * Helper function to validate unique name for entities
 * This is a common pattern used across multiple services
 */
export async function validateUniqueNameForService(config: {
  count: (args: { where: any }) => Promise<number>;
  errorCode: (typeof ErrorCode)[keyof typeof ErrorCode];
  errorMessage: string;
  userId: string;
  name: string;
  excludeId?: string;
  normalizeName?: (name: string) => string;
}): Promise<void> {
  const normalizedName = config.normalizeName
    ? config.normalizeName(config.name)
    : config.name;

  const where: any = {
    userId: config.userId,
    name: normalizedName,
    ...(config.excludeId ? { id: { not: config.excludeId } } : {}),
  };

  const count = await config.count({ where });

  if (count > 0) {
    throwAppError(config.errorCode, config.errorMessage);
  }
}
