import { Inbox, Clock, DollarSign, MailOpen, Archive, Search, UserSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InboxFolder } from '@/hooks/useInboxNotifications';

interface Props {
  folder: InboxFolder;
  searchQuery?: string;
}

export function InboxEmptyState({ folder, searchQuery }: Props) {
  // Search no-results state takes priority
  if (searchQuery && searchQuery.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Search className="h-10 w-10 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Nenhum resultado para &ldquo;{searchQuery.trim()}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground mt-1">Tente buscar com outros termos.</p>
      </div>
    );
  }

  const config: Record<
    InboxFolder,
    {
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      description: string;
      bgClassName: string;
      iconClassName: string;
    }
  > = {
    all: {
      icon: Inbox,
      title: 'Nenhuma notificação',
      description: 'Quando houver lembretes ou ações, aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    unread: {
      icon: MailOpen,
      title: 'Tudo lido!',
      description: 'Nenhuma notificação pendente de leitura.',
      bgClassName: 'bg-green-100 dark:bg-green-900/30',
      iconClassName: 'text-green-600 dark:text-green-400',
    },
    timesheet: {
      icon: Clock,
      title: 'Nenhum lembrete de timesheet',
      description: 'Lembretes de horas aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    reimbursement: {
      icon: DollarSign,
      title: 'Nenhuma notificação de reembolso',
      description: 'Atualizações de reembolsos aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
    budget: {
      icon: Inbox,
      title: 'Nenhuma notificação de orçamento',
      description: 'Notificações de orçamentos aparecerão aqui.',
      bgClassName: 'bg-blue-100 dark:bg-blue-900/30',
      iconClassName: 'text-blue-600 dark:text-blue-400',
    },
    candidates: {
      icon: UserSearch,
      title: 'Nenhuma notificação de candidatura',
      description: 'Notificações de novas candidaturas aparecerão aqui.',
      bgClassName: 'bg-purple-100 dark:bg-purple-900/30',
      iconClassName: 'text-purple-600 dark:text-purple-400',
    },
    archived: {
      icon: Archive,
      title: 'Nenhuma notificação arquivada',
      description: 'Notificações que você arquivar aparecerão aqui.',
      bgClassName: 'bg-muted',
      iconClassName: 'text-muted-foreground',
    },
  };

  const { icon: Icon, title, description, bgClassName, iconClassName } = config[folder];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div className={cn('p-4 rounded-full mb-4', bgClassName)}>
        <Icon className={cn('h-10 w-10', iconClassName)} />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
