import { addMonths, format, getMonth, getYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ProjectMonth {
  year: number;
  month: number;
  label: string;
  monthNumber: number;
}

/**
 * Meses calendário entre o início e o fim do contrato (ou +12 meses, se
 * `endDate` for null — projeto sem data de fim definida ainda).
 */
export function buildProjectMonths(startDate: string, endDate: string | null): ProjectMonth[] {
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addMonths(start, 12);
  const months: ProjectMonth[] = [];
  let current = start;
  let i = 1;
  while (current <= end) {
    months.push({
      year: getYear(current),
      month: getMonth(current) + 1,
      label: format(current, 'MMM/yy', { locale: ptBR }),
      monthNumber: i,
    });
    current = addMonths(current, 1);
    i++;
  }
  return months;
}

/**
 * Janela rolante de meses calendário centrada no mês atual, para projetos
 * `continuous` (sem início/fim de contrato fixo). `offsetStart` é relativo ao
 * mês atual (ex.: -3 = começa 3 meses atrás); `length` é o total de meses.
 */
export function buildRollingMonths(baseDate: Date, offsetStart: number, length: number): ProjectMonth[] {
  const start = addMonths(baseDate, offsetStart);
  const months: ProjectMonth[] = [];
  for (let i = 0; i < length; i++) {
    const current = addMonths(start, i);
    months.push({
      year: getYear(current),
      month: getMonth(current) + 1,
      label: format(current, 'MMM/yy', { locale: ptBR }),
      monthNumber: i + 1 + offsetStart,
    });
  }
  return months;
}
