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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
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

export { cn };
