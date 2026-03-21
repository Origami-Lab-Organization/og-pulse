import { Inbox, Clock, Receipt, CheckCircle2 } from 'lucide-react';

interface Props {
  category: 'all' | 'timesheet' | 'reimbursement';
  filter: 'all' | 'unread' | 'action';
}

export function InboxEmptyState({ category, filter }: Props) {
  if (filter === 'action') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-sm font-medium text-green-700 dark:text-green-400">Tudo em dia!</p>
        <p className="text-xs text-muted-foreground mt-1">Não há ações pendentes no momento.</p>
      </div>
    );
  }

  const config = {
    all: {
      icon: Inbox,
      title: 'Nenhuma notificação',
      description: 'Quando houver lembretes ou ações, eles aparecerão aqui.',
    },
    timesheet: {
      icon: Clock,
      title: 'Nenhum lembrete de timesheet',
      description: 'Seus lembretes de lançamento de horas aparecerão aqui.',
    },
    reimbursement: {
      icon: Receipt,
      title: 'Nenhuma notificação de reembolso',
      description: 'Atualizações sobre seus pedidos de reembolso aparecerão aqui.',
    },
  }[category];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="h-12 w-12 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{config.title}</p>
      <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
    </div>
  );
}
