import { type ErrCode, NotFoundErr } from 'src/share';

export async function ensureExists<
  TDelegate extends { findUnique: (args: any) => Promise<any | null> },
  TWhere,
  TSelect,
>(
  delegate: TDelegate,
  where: TWhere,
  select: TSelect,
  errorCode: ErrCode,
): Promise<
  Awaited<
    ReturnType<
      (args: {
        where: TWhere;
        select: TSelect;
      }) => ReturnType<TDelegate['findUnique']>
    >
  > extends infer R
    ? R extends null
      ? never
      : R
    : never
> {
  const result = await delegate.findUnique({ where, select });
  if (!result) {
    throw new NotFoundErr(errorCode);
  }
  return result as any;
}
