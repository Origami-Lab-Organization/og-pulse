export type HolidayType = 'fixed' | 'floating' | 'one_time';

export interface Holiday {
  id: string;
  tenant_id: string;
  name: string;
  holiday_type: HolidayType;
  fixed_day: number | null;
  fixed_month: number | null;
  specific_date: string | null;
  reference_year: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HolidayFormData {
  name: string;
  holiday_type: HolidayType;
  fixed_day?: number;
  fixed_month?: number;
  specific_date?: string;
  reference_year?: number;
}

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
  fixed: 'Fixo',
  floating: 'Móvel',
  one_time: 'Pontual',
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
