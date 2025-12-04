import { settingCache } from 'src/config/cache';
import { db, type IDb } from 'src/config/db';
import type { Setting } from 'src/generated';
import type { UpdateSettingDto } from 'src/modules/admin/dtos';
import { EncryptService } from 'src/service/auth/encrypt.service';
import { settingService } from 'src/service/misc/setting.service';
import { BadReqErr, ErrCode, NotFoundErr } from 'src/share';

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
    const { id, value, isSecret, description } = params;
    const setting = await this.deps.db.setting.findUnique({
      where: { id },
      select: { value: true, type: true, key: true },
    });
    if (!setting) {
      throw new NotFoundErr(ErrCode.ItemNotFound);
    }
    if (
      !this.deps.settingService.validateSetting(
        setting.key,
        value,
        setting.type,
      ).valid
    ) {
      throw new BadReqErr(ErrCode.BadRequest);
    }
    const newValue = isSecret ? EncryptService.aes256Encrypt(value) : value;
    const updated = await this.deps.db.setting.update({
      where: { id },
      data: {
        value: newValue,
        isSecret,
        ...(description !== undefined && { description }),
      },
    });
    await settingCache.set(
      updated.key,
      this.deps.settingService.getValue(updated),
    );
  }

  export() {
    return this.deps.settingService.exportSettings();
  }

  async import(data: Record<string, string>) {
    const result = await this.deps.settingService.importSettings(data);
    if (result.errors.length > 0) {
      throw new BadReqErr(ErrCode.BadRequest, { errors: result.errors });
    }
    return result;
  }
}

export const settingAdminService = new SettingAdminService();
