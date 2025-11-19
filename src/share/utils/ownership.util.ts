import type { ErrorCodeType } from '../constants/error';
import { throwAppError } from '../constants/error';
import type { IdUtil } from './id.util';

/**
 * Validates that a resource belongs to a specific user by extracting userId from resourceId
 * @param userId - The user ID to validate against
 * @param resourceId - The resource ID that should contain the user ID
 * @param idUtil - The ID utility to extract user ID from resource ID
 * @param errorCode - Error code to throw if validation fails
 * @param errorMessage - Error message to throw if validation fails
 * @throws AppError if the resource does not belong to the user
 */
export function validateResourceOwnership(
  userId: string,
  resourceId: string,
  idUtil: IdUtil,
  errorCode: ErrorCodeType,
  errorMessage: string,
): void {
  const extractedUserId = idUtil.extractUserIdFromId(resourceId);
  if (!extractedUserId || extractedUserId !== userId) {
    throwAppError(errorCode, errorMessage);
  }
}
