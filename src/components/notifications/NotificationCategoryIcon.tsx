import { Bell, Clock, FileText, FolderKanban, NotebookPen } from 'lucide-react';

const CATEGORY_ICON = {
  timesheet: Clock,
  projeto: FolderKanban,
  budget: FileText,
  nota: NotebookPen,
} as const;

/** Ícone pela categoria da notificação; o sino genérico para o resto. */
export function NotificationCategoryIcon(props: { category: string }) {
  const Icon = CATEGORY_ICON[props.category as keyof typeof CATEGORY_ICON] ?? Bell;
  return <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}
