import type { ErrorCodeType } from '../constants/error';
import { throwAppError } from '../constants/error';
import type { IdUtil } from './id.util';

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
