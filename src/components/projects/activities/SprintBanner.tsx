import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarRange, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useActivitySprints, useUpdateSprintGoal } from '@/hooks/useActivitySprints';
import { ProjectActivityCardWithRelations } from '@/types/projectActivity';

interface SprintBannerProps {
  projectId: string;
  cards: ProjectActivityCardWithRelations[];
  isPM: boolean;
  onOpenSettings: () => void;
  onOpenPlanning: (sprintId: string) => void;
}

function fmtDate(d: string): string {
  try { return format(parseISO(d), 'dd/MM', { locale: ptBR }); } catch { return d; }
}

export function SprintBanner({
  projectId,
  cards,
  isPM,
  onOpenSettings,
  onOpenPlanning,
}: SprintBannerProps) {
  const { data: sprints = [] } = useActivitySprints(projectId);
  const updateGoal = useUpdateSprintGoal();

  const activeSprint = sprints.find((s) => s.status === 'active') ?? null;
  const nextSprint   = sprints.find((s) => s.status === 'planned') ?? null;

  // ── Inline goal edit ──────────────────────────────────────────────────────
  const [editing,   setEditing]   = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  useEffect(() => {
    setGoalDraft(activeSprint?.goal ?? '');
  }, [activeSprint?.goal]);

  const saveGoal = () => {
    if (!activeSprint) return;
    const trimmed = goalDraft.trim();
    if (trimmed !== (activeSprint.goal ?? '')) {
      updateGoal.mutate({ id: activeSprint.id, projectId, goal: trimmed || null });
    }
    setEditing(false);
  };

  // ── Committed points ──────────────────────────────────────────────────────
  const committedPoints = activeSprint
    ? cards
        .filter((c) => c.sprint_id === activeSprint.id && c.column_name !== 'product_backlog')
        .reduce((sum, c) => sum + (c.points ?? 0), 0)
    : 0;

  // ── No active sprint ──────────────────────────────────────────────────────
  if (!activeSprint) {
    return (
      <Alert className="mb-3 shrink-0">
        <AlertDescription className="flex items-center justify-between gap-2">
          <span>Nenhuma sprint ativa. Configure as sprints nas configurações do board.</span>
          {isPM && (
            <button
              className="text-sm text-primary underline-offset-4 hover:underline shrink-0"
              onClick={onOpenSettings}
            >
              ⚙️ Configurações
            </button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // ── Active sprint banner ──────────────────────────────────────────────────
  return (
    <div className="mb-3 flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 shrink-0 flex-wrap">
      {/* Name + period */}
      <div className="flex items-center gap-2 shrink-0">
        <CalendarRange className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold text-foreground">{activeSprint.name}</span>
        <span className="text-xs text-muted-foreground">
          {fmtDate(activeSprint.start_date)} – {fmtDate(activeSprint.end_date)}
        </span>
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      {/* Goal inline edit */}
      <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
        <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {editing ? (
          <Input
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            className="h-7 text-sm py-0 flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveGoal();
              if (e.key === 'Escape') setEditing(false);
            }}
            onBlur={saveGoal}
          />
        ) : (
          <button
            className="text-sm text-left flex-1 truncate text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => { if (isPM) setEditing(true); }}
            title={isPM ? 'Clique para editar o objetivo' : undefined}
          >
            {activeSprint.goal || (isPM ? 'Definir objetivo da sprint...' : '—')}
          </button>
        )}
      </div>

      <div className="h-4 w-px bg-border shrink-0" />

      {/* Committed points */}
      <Badge variant="outline" className="shrink-0 text-xs">
        {committedPoints} pts comprometidos
      </Badge>

      {/* Planejar Sprint button — only when there's a planned sprint */}
      {isPM && nextSprint && (
        <Button
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={() => onOpenPlanning(nextSprint.id)}
        >
          Planejar Sprint
        </Button>
      )}
    </div>
  );
}
