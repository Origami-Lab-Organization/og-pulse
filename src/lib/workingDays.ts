import { addDays, format } from 'date-fns';

export interface Holiday {
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

/**
 * Último dia útil da semana de trabalho (seg–sex) que começa em `weekStart`.
 *
 * É a partir dele que a semana pode ser enviada: com feriado na sexta, o envio abre na quinta.
 * Quem diz o que é feriado é quem chama — a grade passa o mesmo critério que pinta a célula de
 * feriado, então o dia que aparece como feriado é o dia que não segura o envio.
 *
 * Semana inteira de feriado não tem dia útil: devolve a sexta, que é a regra sem feriado.
 */
export function ultimoDiaUtilDaSemana(weekStart: Date, ehFeriado: (dia: Date) => boolean): Date {
  for (let i = 4; i >= 0; i--) {
    const dia = addDays(weekStart, i);
    if (!ehFeriado(dia)) return dia;
  }
  return addDays(weekStart, 4);
}

/**
 * Hoje já é dia de enviar a semana corrente? Na semana comum é só a sexta; com feriado na
 * sexta, vale da quinta em diante. Fim de semana nunca é dia de envio.
 */
export function ehDiaDeEnvio(
  hoje: Date,
  inicioDaSemanaCorrente: Date,
  ehFeriado: (dia: Date) => boolean,
): boolean {
  const diaDaSemana = hoje.getDay();
  if (diaDaSemana === 0 || diaDaSemana === 6) return false;
  return ultimoDiaUtilDaSemana(inicioDaSemanaCorrente, ehFeriado) <= hoje;
}
