export function timeStringToSeconds(timeString: string): number {
  const match = timeString
    .trim()
    .match(/^(\d+)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)$/i);

  if (!match) {
    throw new Error(
      `Invalid time string format: ${timeString}. Expected format: "number unit" (e.g., "15 days")`,
    );
  }

  const value = Number.parseInt(match[1] ?? '0', 10);
  const unit = (match[2] ?? '').toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1,
    seconds: 1,
    minute: 60,
    minutes: 60,
    hour: 3600,
    hours: 3600,
    day: 86400,
    days: 86400,
    week: 604800,
    weeks: 604800,
    month: 2592000,
    months: 2592000,
    year: 31536000,
    years: 31536000,
  };

  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(`Unknown time unit: ${unit}`);
  }

  return value * multiplier;
}

import dayjs from 'dayjs';

export const isExpired = (now: Date | number): boolean => {
  const targetDate = dayjs(now);
  const comparisonDate = dayjs();
  return comparisonDate.isAfter(targetDate);
};
