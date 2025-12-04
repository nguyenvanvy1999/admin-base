import { Value } from '@sinclair/typebox/value';
import { db, type IDb } from 'src/config/db';
import type { I18nWhereInput } from 'src/generated';
import {
  I18NImportDto,
  type I18nPaginationDto,
  type I18nUpsertDto,
} from 'src/modules/admin/dtos';
import { BadReqErr, DB_PREFIX, ErrCode, IdUtil, type IIdsDto } from 'src/share';
import XLSX from 'xlsx';

type ListParams = typeof I18nPaginationDto.static;
type UpsertParams = typeof I18nUpsertDto.static;

export class I18nService {
  constructor(
    private readonly deps: {
      db: IDb;
    } = {
      db,
    },
  ) {}

  async list(params: ListParams) {
    const { key, take, skip } = params;
    const where: I18nWhereInput = key ? { key: { contains: key } } : {};
    const [docs, count] = await Promise.all([
      this.deps.db.i18n.findMany({
        where,
        select: { id: true, key: true, en: true, vi: true },
        orderBy: { key: 'asc' },
        skip,
        take,
      }),
      this.deps.db.i18n.count({ where }),
    ]);
    return { docs, count };
  }

  async upsert(params: UpsertParams): Promise<void> {
    const where: I18nWhereInput[] = [{ key: params.key }];
    if (params.id) {
      where.push({ id: { not: params.id } });
    }
    const exist = await this.deps.db.i18n.findFirst({
      where: { AND: where },
      select: { id: true },
    });
    if (exist) {
      throw new BadReqErr(ErrCode.ItemExists);
    }

    if (params.id) {
      await this.deps.db.i18n.update({
        where: { id: params.id },
        data: params,
        select: { id: true },
      });
    } else {
      await this.deps.db.i18n.create({
        data: { ...params, id: IdUtil.dbId(DB_PREFIX.I18N) },
        select: { id: true },
      });
    }
  }

  async delete(params: IIdsDto): Promise<void> {
    await this.deps.db.i18n.deleteMany({
      where: { id: { in: params.ids } },
    });
  }

  async import(params: { file: File }): Promise<void> {
    const workbook = XLSX.read(await params.file.arrayBuffer(), {
      type: 'buffer',
    });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadReqErr(ErrCode.ImportDataInvalid);
    }
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new BadReqErr(ErrCode.ImportDataInvalid);
    }
    const data: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    });
    if (data.length <= 1) {
      throw new BadReqErr(ErrCode.ImportDataInvalid);
    }

    const headers = data[0] ?? [];
    const validatedData: (typeof I18NImportDto.static)[] = [];
    const keys: string[] = [];

    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex] ?? [];
      const rowObject: Record<string, string> = {};

      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        rowObject[String(headers[colIndex])] = String(row[colIndex] || '');
      }
      const result = Value.Check(I18NImportDto, rowObject);
      if (!result) {
        throw new BadReqErr(ErrCode.ImportDataInvalid);
      }

      validatedData.push(rowObject);
      keys.push(rowObject.KEY);
    }

    if (validatedData.length === 0) {
      throw new BadReqErr(ErrCode.ImportDataInvalid);
    }

    await this.deps.db.$transaction([
      this.deps.db.i18n.deleteMany({ where: { key: { in: keys } } }),
      this.deps.db.i18n.createMany({
        data: validatedData.map((data) => ({
          id: IdUtil.dbId(DB_PREFIX.I18N),
          key: data.KEY,
          en: data.EN,
          zh: data.ZH,
          ko: data.KO,
          vi: data.VI,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  async export(): Promise<Response> {
    const translations = await this.deps.db.i18n.findMany({
      select: { key: true, en: true, vi: true },
    });
    const keys = ['KEY', 'EN', 'ZH', 'KR', 'VI'];
    const data = translations.map((translation) => [
      translation.key,
      translation.en,
      null,
      null,
      translation.vi,
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([keys, ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'i18n');
    worksheet['!cols'] = keys.map(() => ({ wch: 20 }));
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const res = new Response(buffer);
    res.headers.set('Content-Type', 'application/vnd.ms-excel');
    res.headers.set(
      'Content-Disposition',
      `attachment; filename="translations_${new Date().getTime()}.xlsx"`,
    );
    return res;
  }
}

export const i18nService = new I18nService();
