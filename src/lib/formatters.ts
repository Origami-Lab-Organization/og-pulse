import { cn } from '@/lib/utils';

/**
 * Converte texto para Title Case, preservando siglas empresariais
 * Ex: "PRUMO ENGENHARIA LTDA" -> "Prumo Engenharia LTDA"
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  
  // Palavras que devem permanecer em MAIÚSCULO (siglas empresariais)
  const upperCaseWords = ['LTDA', 'S/A', 'SA', 'ME', 'EPP', 'EIRELI', 'SS', 'CNPJ', 'CPF'];
  
  // Palavras que devem permanecer em minúsculo
  const lowerCaseWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'com'];
  
  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      const upperWord = word.toUpperCase();
      
      // Verificar se é uma sigla que deve ficar em maiúsculo
      if (upperCaseWords.includes(upperWord)) {
        return upperWord;
      }
      
      // Verificar se é uma palavra que deve ficar em minúsculo (exceto primeira palavra)
      if (index > 0 && lowerCaseWords.includes(word)) {
        return word;
      }
      
      // Capitalizar primeira letra
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function formatShortName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/**
 * Trunca (não arredonda) um valor para até 2 casas decimais.
 * Ex.: 88.888888 → 88.88, 99.999 → 99.99, 5.333333 → 5.33.
 * Passa por toFixed(8) antes de cortar a string para não confundir ruído de
 * ponto flutuante (ex.: 1.005 * 100 === 100.49999999999999) com casas reais.
 */
export function truncateToCents(value: number): number {
  if (!Number.isFinite(value)) return value;
  const sign = value < 0 ? -1 : 1;
  const fixed = Math.abs(value).toFixed(8);
  const dotIndex = fixed.indexOf('.');
  return sign * parseFloat(fixed.slice(0, dotIndex + 3));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(truncateToCents(value));
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Formata horas removendo casas decimais desnecessárias.
 * Ex.: 97.80000000 → "97.8h", 473.40 → "473.4h", 100 → "100h".
 */
export function formatHours(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  return `${Number(n.toFixed(2))}h`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  if (typeof date === 'string') {
    // Se a data vier no formato YYYY-MM-DD (sem horário),
    // interpretar como data local, não UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
    return new Date(date).toLocaleDateString('pt-BR');
  }
  
  return date.toLocaleDateString('pt-BR');
}

export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  
  if (typeof date === 'string') {
    // Mesmo tratamento para datas no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });
    }
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/**
 * Converte string de data YYYY-MM-DD para objeto Date
 * tratando como data local (não UTC)
 */
export function parseDateString(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

/**
 * Data de hoje como 'YYYY-MM-DD' no fuso LOCAL do navegador — não usar
 * `new Date().toISOString().slice(0, 10)` (UTC) para isso: em fusos negativos
 * (ex.: Brasília, UTC-3), entre ~21h e meia-noite local o UTC já virou o dia
 * seguinte, fazendo comparações de "isFutureDated" contra uma data escolhida
 * no calendário (sempre local) falharem justo nessa janela.
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date());
}

const MONTH_NAMES_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Converte o número do mês do projeto (1-based) para o label do mês calendário
 * baseado na data de início do projeto.
 * Ex: projectStartDate='2026-01-15', monthNumber=1 → 'Jan/26'
 *     projectStartDate='2026-03-01', monthNumber=2 → 'Abr/26'
 */
export function getProjectMonthLabel(monthNumber: number, projectStartDate: string): string {
  const startDate = parseDateString(projectStartDate);
  const startMonth = startDate.getMonth(); // 0-based
  const startYear = startDate.getFullYear();
  
  const targetMonth = (startMonth + monthNumber - 1) % 12;
  const targetYear = startYear + Math.floor((startMonth + monthNumber - 1) / 12);
  const yearShort = String(targetYear).slice(-2);
  
  return `${MONTH_NAMES_SHORT[targetMonth]}/${yearShort}`;
}

export { cn };
