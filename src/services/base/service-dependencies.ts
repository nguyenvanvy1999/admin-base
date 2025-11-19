import type { IDb } from '@server/configs/db';
import type { IdUtil } from '@server/share';

/**
 * Common dependencies interface for services
 */
export interface BaseServiceDependencies {
  db: IDb;
  idUtil: IdUtil;
}
