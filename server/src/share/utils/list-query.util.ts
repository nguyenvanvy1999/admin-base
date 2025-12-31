type ExtractField<TObj, TKey extends PropertyKey> = TKey extends keyof TObj
  ? TObj[TKey]
  : undefined;

export async function executeListQuery<
  TDelegate extends {
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  },
>(
  delegate: TDelegate,
  options: {
    where?: ExtractField<
      NonNullable<Parameters<TDelegate['findMany']>[0]>,
      'where'
    >;
    select?: ExtractField<
      NonNullable<Parameters<TDelegate['findMany']>[0]>,
      'select'
    >;
    orderBy?: ExtractField<
      NonNullable<Parameters<TDelegate['findMany']>[0]>,
      'orderBy'
    >;
    take: number;
    skip: number;
  },
): Promise<{
  docs: Awaited<ReturnType<TDelegate['findMany']>>;
  count: number;
}> {
  const [docs, count] = await Promise.all([
    delegate.findMany(options),
    delegate.count(options.where !== undefined ? { where: options.where } : {}),
  ]);

  return { docs: docs as Awaited<ReturnType<TDelegate['findMany']>>, count };
}
