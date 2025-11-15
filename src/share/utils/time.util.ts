import dayjs from 'dayjs';

export class TimeUtil {
  isExpired(now: Date | number): boolean {
    const targetDate = dayjs(now);
    const comparisonDate = dayjs();
    return comparisonDate.isAfter(targetDate);
  }

  parseTime(timeStr: string): number {
    const match = timeStr.match(
      /^(\d+)\s*(second|minute|hour|day|week|month|year)s?$/i,
    );
    if (!match) {
      return 15 * 60;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers: Record<string, number> = {
      second: 1,
      minute: 60,
      hour: 3600,
      day: 86400,
      week: 604800,
      month: 2592000,
      year: 31536000,
    };
    return value * (multipliers[unit] || 60);
  }
}
export const timeUtil = new TimeUtil();
