import { parseISO } from 'date-fns';

/** "agora", "5min", "3h", "ontem", "4d" — a idade de uma notificação, curta como no Outlook. */
export function notificationAge(dateStr: string): string {
  const diffMin = Math.floor((Date.now() - parseISO(dateStr).getTime()) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? 'ontem' : `${diffDays}d`;
}
