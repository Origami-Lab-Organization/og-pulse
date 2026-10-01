/** Período da tela Financeiro: presets por mês, em datas locais (o Pulse lê mês como o calendário). */

export enum PeriodPreset {
  ThisMonth = 'este_mes',
  LastMonth = 'mes_passado',
  LastThree = 'ultimos_3',
  ThisYear = 'este_ano',
  LastYear = 'ano_passado',
}

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  [PeriodPreset.ThisMonth]: 'Este mês',
  [PeriodPreset.LastMonth]: 'Mês passado',
  [PeriodPreset.LastThree]: 'Últimos 3 meses',
  [PeriodPreset.ThisYear]: 'Este ano',
  [PeriodPreset.LastYear]: 'Ano passado',
};

export interface PeriodRange {
  from: string;
  to: string;
  /** As mesmas datas como Date, para os hooks que filtram por período (custo por centro). */
  startDate: Date;
  endDate: Date;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthStart = (year: number, month: number) => new Date(year, month, 1);
const monthEnd = (year: number, month: number) => new Date(year, month + 1, 0);

export function periodRange(preset: PeriodPreset, today: Date): PeriodRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const ranges: Record<PeriodPreset, [Date, Date]> = {
    [PeriodPreset.ThisMonth]: [monthStart(y, m), monthEnd(y, m)],
    [PeriodPreset.LastMonth]: [monthStart(y, m - 1), monthEnd(y, m - 1)],
    [PeriodPreset.LastThree]: [monthStart(y, m - 2), monthEnd(y, m)],
    [PeriodPreset.ThisYear]: [monthStart(y, 0), monthEnd(y, 11)],
    [PeriodPreset.LastYear]: [monthStart(y - 1, 0), monthEnd(y - 1, 11)],
  };
  const [startDate, endDate] = ranges[preset];
  return { from: iso(startDate), to: iso(endDate), startDate, endDate };
}
