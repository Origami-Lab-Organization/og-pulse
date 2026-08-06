import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Início e fim da grade do mês: semanas completas, então inclui alguns dias do
 * mês anterior e do seguinte. É esse intervalo que vai para o Graph.
 */
export function getMonthGridRange(month: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(month), { locale: ptBR }),
    end: endOfWeek(endOfMonth(month), { locale: ptBR }),
  };
}
