import { cn } from '@/lib/utils';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
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

export { cn };
