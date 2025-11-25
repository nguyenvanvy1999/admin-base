import type { IDb } from '@server/configs/db';
import type { IdUtil } from '@server/share';

export interface BaseServiceDependencies {
  db: IDb;
  idUtil: IdUtil;
}
