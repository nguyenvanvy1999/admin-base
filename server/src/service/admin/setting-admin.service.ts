import { settingCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { Setting } from 'src/generated';
import type { UpdateSettingDto } from 'src/modules/admin/dtos';
import { EncryptService } from 'src/service/auth/encrypt.service';
import { settingService } from 'src/service/misc/setting.service';
import { ErrCode, NotFoundErr } from 'src/share';

type UpdateParams = typeof UpdateSettingDto.static & { id: string };

export class SettingAdminService {
  constructor(
    private readonly deps: {
      db: IDb;
      settingService: typeof settingService;
    } = {
      db,
      settingService,
    },
  ) {}

  async list() {
    const settings = await this.deps.db.setting.findMany();
    return Promise.all(
      settings.map((x: Setting) => {
        const result = { ...x };
        if (x.isSecret) {
          result.value = '************';
        }
        return result;
      }),
    );
  }

  async update(params: UpdateParams): Promise<void> {
    const { id, value, isSecret } = params;
    const setting = await this.deps.db.setting.findUnique({
      where: { id },
      select: { value: true, type: true, key: true },
    });
    if (!setting) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }
    if (!this.deps.settingService.checkValue(value, setting.type)) {
      throw new Error(ErrCode.BadRequest);
    }
    const newValue = isSecret ? EncryptService.aes256Encrypt(value) : value;
    const updated = await this.deps.db.setting.update({
      where: { id },
      data: {
        value: newValue,
        isSecret,
      },
    });
    await settingCache.set(
      updated.key,
      await this.deps.settingService.getValue(updated),
    );
  }
}

export const settingAdminService = new SettingAdminService();
