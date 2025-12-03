export class AsyncUtil {
  static sequential<T, R>(
    items: T[],
    callback: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    return items.reduce<Promise<R[]>>(async (prevPromise, item, index) => {
      const results = await prevPromise;
      const result = await callback(item, index);
      return results.concat(result);
    }, Promise.resolve([]));
  }
}
