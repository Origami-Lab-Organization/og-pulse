// ACT-08 — Histórico de alterações do card
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { COLUMN_LABELS } from '@/types/projectActivity';
import { CARD_TYPE_LABELS } from '@/types/projectActivity';

interface CardHistoryProps {
  cardId: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  card_type: 'Tipo',
  points: 'Pontos',
  assignee_id: 'Responsável',
  user_story: 'User Story',
  acceptance_criteria: 'Critérios de Aceitação',
  is_blocked: 'Bloqueado',
  blocked_reason: 'Motivo do bloqueio',
  status: 'Coluna',
};

function formatValue(field: string, value: string | null): string {
  if (value === null) return '—';
  if (field === 'status') return COLUMN_LABELS[value as keyof typeof COLUMN_LABELS] ?? value;
  if (field === 'card_type') return CARD_TYPE_LABELS[value as keyof typeof CARD_TYPE_LABELS] ?? value;
  if (field === 'is_blocked') return value === 'true' ? 'Sim' : 'Não';
  return value;
}

export function CardHistory({ cardId }: CardHistoryProps) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['card-history', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_card_history')
        .select('*, changed_by_employee:employees!project_activity_card_history_changed_by_fkey(nome)')
        .eq('card_id', cardId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!cardId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">Nenhum histórico registrado.</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry: any) => (
        <div key={entry.id} className="text-xs text-muted-foreground space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">
              {entry.changed_by_employee?.nome ?? 'Sistema'}
            </span>
            <span>
              {entry.changed_at ? formatDistanceToNow(parseISO(entry.changed_at), { addSuffix: true, locale: ptBR }) : ''}
            </span>
          </div>
          <p>
            <span className="font-medium">{FIELD_LABELS[entry.field] ?? entry.field}</span>
            {': '}
            <span className="line-through opacity-60">{formatValue(entry.field, entry.old_value)}</span>
            {' → '}
            <span>{formatValue(entry.field, entry.new_value)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}
