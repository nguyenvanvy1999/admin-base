export async function executeListQuery<
  TDelegate extends {
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  },
  TSelect = any,
  TWhere = any,
>(
  delegate: TDelegate,
  options: {
    where?: TWhere;
    select?: TSelect;
    orderBy?: any;
    take: number;
    skip: number;
  },
): Promise<{
  docs: Awaited<ReturnType<TDelegate['findMany']>>;
  count: number;
}> {
  const [docs, count] = await Promise.all([
    delegate.findMany(options),
    delegate.count({ where: options.where }),
  ]);

  return { docs: docs as Awaited<ReturnType<TDelegate['findMany']>>, count };
}
