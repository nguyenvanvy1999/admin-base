export class ValueUtil {
  static isNil(value: unknown): value is null | undefined {
    return value == null;
  }

  static notNil<T>(value: T): value is NonNullable<T> {
    return !ValueUtil.isNil(value);
  }
}
