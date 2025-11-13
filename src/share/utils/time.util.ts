import dayjs from 'dayjs';

export class TimeUtil {
  static isExpired(now: Date | number): boolean {
    const targetDate = dayjs(now);
    const comparisonDate = dayjs();
    return comparisonDate.isAfter(targetDate);
  }
}
