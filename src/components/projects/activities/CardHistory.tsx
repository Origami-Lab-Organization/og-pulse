// ACT-08 — Histórico de alterações do card
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useCardHistory } from '@/hooks/useActivityCards';
import { COLUMN_LABELS, CARD_TYPE_LABELS } from '@/types/projectActivity';
import { cn } from '@/lib/utils';

// ── Column badge colors ──────────────────────────────────────────────────────
const COLUMN_BADGE_CLASS: Record<string, string> = {
  product_backlog: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300',
  sprint_backlog:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300',
  in_dev:          'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300',
  in_test:         'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300',
  in_deploy:       'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300',
  done:            'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300',
};

const FIELD_LABELS: Record<string, string> = {
  title:               'Título',
  card_type:           'Tipo',
  points:              'Pontos',
  assignee_id:         'Responsável',
  user_story:          'User Story',
  acceptance_criteria: 'Critérios de Aceitação',
  is_blocked:          'Bloqueado',
  blocked_reason:      'Motivo do bloqueio',
  status:              'Coluna',
  dor:                 'DoR',
  dod:                 'DoD',
  task_added:          'Tarefa adicionada',
  task_completed:      'Tarefa concluída',
};

function formatFieldValue(field: string, value: string | null): string {
  if (value === null) return '—';
  if (field === 'status') return COLUMN_LABELS[value as keyof typeof COLUMN_LABELS] ?? value;
  if (field === 'card_type') return CARD_TYPE_LABELS[value as keyof typeof CARD_TYPE_LABELS] ?? value;
  if (field === 'is_blocked') return value === 'true' ? 'Sim' : 'Não';
  return value;
}

function ColumnBadge({ col }: { col: string | null }) {
  const label = col ? (COLUMN_LABELS[col as keyof typeof COLUMN_LABELS] ?? col) : '—';
  return (
    <Badge
      variant="outline"
      className={cn('text-xs px-1.5 py-0', col ? COLUMN_BADGE_CLASS[col] : '')}
    >
      {label}
    </Badge>
  );
}

interface CardHistoryProps {
  cardId: string;
}

export function CardHistory({ cardId }: CardHistoryProps) {
  const { data: entries = [], isLoading } = useCardHistory(cardId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-7 w-7 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
    );
  }

  return (
    <ScrollArea className="max-h-[320px]">
      <div className="relative pl-3">
        {/* Vertical line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" aria-hidden />

        <div className="space-y-5">
          {entries.map((entry) => {
            const nome = entry.changed_by_employee?.nome ?? 'Sistema';
            const fotoUrl = entry.changed_by_employee?.foto_url ?? undefined;
            const initials = nome
              .split(' ')
              .slice(0, 2)
              .map((s) => s[0])
              .join('')
              .toUpperCase();

            const isColumnChange = entry.field === 'status';
            const fieldLabel = FIELD_LABELS[entry.field] ?? entry.field;
            const relativeTime = entry.changed_at
              ? formatDistanceToNow(parseISO(entry.changed_at), { addSuffix: true, locale: ptBR })
              : '';

            return (
              <div key={entry.id} className="relative flex gap-3 pl-3">
                {/* Bullet + avatar */}
                <div className="absolute -left-[0px] top-1 flex h-3 w-3 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40 ring-2 ring-background" />
                </div>

                <Avatar className="h-6 w-6 shrink-0 text-[10px] mt-0.5">
                  <AvatarImage src={fotoUrl} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{nome}</span>
                    <span className="text-xs text-muted-foreground">{relativeTime}</span>
                  </div>

                  {isColumnChange ? (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <ColumnBadge col={entry.old_value} />
                      <span className="text-xs text-muted-foreground">→</span>
                      <ColumnBadge col={entry.new_value} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-medium text-foreground/80">{fieldLabel}</span>
                      {': '}
                      <span className="line-through opacity-60">
                        {formatFieldValue(entry.field, entry.old_value)}
                      </span>
                      {' → '}
                      <span>{formatFieldValue(entry.field, entry.new_value)}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
