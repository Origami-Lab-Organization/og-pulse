import { format } from 'date-fns';

interface Holiday {
  holiday_type: string;
  fixed_day: number | null;
  fixed_month: number | null;
  specific_date: string | null;
}

export function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const day = current.getDate();
      const month = current.getMonth() + 1;
      const dateStr = format(current, 'yyyy-MM-dd');
      const isHoliday = holidays.some(h =>
        h.holiday_type === 'fixed'
          ? h.fixed_day === day && h.fixed_month === month
          : h.specific_date === dateStr
      );
      if (!isHoliday) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}
