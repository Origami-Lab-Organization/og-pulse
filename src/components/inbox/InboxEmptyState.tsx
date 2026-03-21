import { Inbox, Clock, Receipt, CheckCircle2, Archive } from 'lucide-react';
import type { InboxFolder } from '@/hooks/useInboxNotifications';

interface Props {
  folder: InboxFolder;
}

export function InboxEmptyState({ folder }: Props) {
  const config: Record<InboxFolder, { icon: React.ComponentType<{ className?: string }>; title: string; description: string; iconClassName?: string; bgClassName?: string }> = {
    all: {
      icon: Inbox,
      title: 'Caixa de entrada vazia',
      description: 'Quando houver lembretes ou ações, eles aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    unread: {
      icon: CheckCircle2,
      title: 'Tudo lido!',
      description: 'Não há notificações não lidas no momento.',
      bgClassName: 'bg-green-100 dark:bg-green-900/30',
      iconClassName: 'text-green-600 dark:text-green-400',
    },
    timesheet: {
      icon: Clock,
      title: 'Nenhum lembrete de timesheet',
      description: 'Seus lembretes de lançamento de horas aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    reimbursement: {
      icon: Receipt,
      title: 'Nenhuma notificação de reembolso',
      description: 'Atualizações sobre seus pedidos de reembolso aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    archived: {
      icon: Archive,
      title: 'Nenhuma notificação arquivada',
      description: 'Notificações arquivadas aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
  };

  const { icon: Icon, title, description, bgClassName = 'bg-muted', iconClassName = 'text-muted-foreground' } = config[folder];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className={`p-4 rounded-full ${bgClassName} mb-4`}>
        <Icon className={`h-10 w-10 ${iconClassName}`} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
