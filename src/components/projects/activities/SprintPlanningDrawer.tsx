import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BookOpen, Bug, Wrench, CheckSquare, AlertTriangle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUpdateSprintGoal } from '@/hooks/useActivitySprints';
import {
  ActivitySprintDB,
  ProjectActivityCardWithRelations,
  ActivityCardType,
  CARD_TYPE_LABELS,
} from '@/types/projectActivity';

// ── Card type icon / color maps ───────────────────────────────────────────────
const CARD_TYPE_ICON: Record<ActivityCardType, React.ElementType> = {
  story:     BookOpen,
  bug:       Bug,
  tech_debt: Wrench,
  task:      CheckSquare,
};

const CARD_TYPE_COLOR: Record<ActivityCardType, string> = {
  story:     'text-blue-600 dark:text-blue-400',
  bug:       'text-red-600 dark:text-red-400',
  tech_debt: 'text-amber-600 dark:text-amber-400',
  task:      'text-muted-foreground',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: string): string {
  try { return format(parseISO(d), 'dd/MM', { locale: ptBR }); } catch { return d; }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SprintPlanningDrawerProps {
  open: boolean;
  /** Sprint to plan (move backlog cards into). null = no planned sprint. */
  targetSprint: ActivitySprintDB | null;
  projectId: string;
  /** All board cards — the drawer filters for product_backlog ones. */
  cards: ProjectActivityCardWithRelations[];
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function SprintPlanningDrawer({
  open,
  targetSprint,
  projectId,
  cards,
  onClose,
}: SprintPlanningDrawerProps) {
  const { employee } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateGoal = useUpdateSprintGoal();

  const [goalDraft,   setGoalDraft]   = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirming,  setConfirming]  = useState(false);

  // Product Backlog cards available to commit.
  // Cards pre-tagged with this sprint come first so they're easy to select.
  const backlogCards = cards
    .filter((c) => c.column_name === 'product_backlog')
    .sort((a, b) => {
      const aTagged = a.target_sprint_id === targetSprint?.id ? -1 : 0;
      const bTagged = b.target_sprint_id === targetSprint?.id ? -1 : 0;
      return aTagged - bTagged;
    });

  // Reset state whenever the drawer opens / target sprint changes
  useEffect(() => {
    if (open) {
      setGoalDraft(targetSprint?.goal ?? '');
      setSelectedIds(new Set());
    }
  }, [open, targetSprint]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const committedPoints = [...selectedIds].reduce((sum, id) => {
    const card = backlogCards.find((c) => c.id === id);
    return sum + (card?.points ?? 0);
  }, 0);

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Confirm planning ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!targetSprint) return;
    setConfirming(true);
    try {
      // 1. Save goal if changed
      const newGoal = goalDraft.trim() || null;
      if (newGoal !== (targetSprint.goal ?? null)) {
        await updateGoal.mutateAsync({ id: targetSprint.id, projectId, goal: newGoal });
      }

      // 2. Batch-move selected cards → sprint_backlog and clear target_sprint_id
      const toMove = [...selectedIds];
      if (toMove.length > 0) {
        const { error } = await supabase
          .from('project_activity_cards')
          .update({
            column_name:      'sprint_backlog',
            sprint_id:        targetSprint.id,
            target_sprint_id: null,
            updated_at:       new Date().toISOString(),
          })
          .in('id', toMove);
        if (error) throw error;

        // DB trigger handles history logging for column_name changes (field='status')
        queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
      }

      toast({ title: 'Sprint planning confirmado' });
      onClose();
    } catch {
      toast({ title: 'Erro ao confirmar planning', variant: 'destructive' });
    } finally {
      setConfirming(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-[600px] max-w-[95vw] flex flex-col p-0">

        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="text-base">
            {targetSprint ? targetSprint.name : 'Planejar Sprint'}
          </SheetTitle>
          {targetSprint && (
            <p className="text-xs text-muted-foreground">
              {fmtDate(targetSprint.start_date)} – {fmtDate(targetSprint.end_date)}
            </p>
          )}
        </SheetHeader>

        {/* No planned sprint */}
        {!targetSprint ? (
          <div className="p-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Crie a próxima sprint em Configurações antes de planejar.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <>
            {/* Sprint Goal */}
            <div className="px-6 py-4 shrink-0 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sprint Goal
              </Label>
              <Textarea
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                placeholder="Defina o objetivo desta sprint..."
                className="text-sm resize-none"
                rows={3}
              />
            </div>

            <Separator />

            {/* Backlog list header */}
            <div className="px-6 pt-4 pb-2 shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Product Backlog ({backlogCards.length})
              </p>
            </div>

            {/* Scrollable card list */}
            <ScrollArea className="flex-1 px-6">
              {backlogCards.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Nenhum card no Product Backlog.
                </p>
              ) : (
                <div className="space-y-1 pb-4">
                  {backlogCards.map((card) => {
                    const Icon      = CARD_TYPE_ICON[card.card_type];
                    const checked   = selectedIds.has(card.id);
                    const isPreTagged = card.target_sprint_id === targetSprint?.id;
                    return (
                      <div
                        key={card.id}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors',
                          checked
                            ? 'bg-primary/5 border border-primary/20'
                            : 'hover:bg-muted/50 border border-transparent'
                        )}
                        onClick={() => toggleCard(card.id)}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCard(card.id)}
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Icon className={cn('h-3.5 w-3.5 shrink-0', CARD_TYPE_COLOR[card.card_type])}
                          title={CARD_TYPE_LABELS[card.card_type]}
                        />
                        <span className="text-sm flex-1 leading-snug line-clamp-1">
                          {card.title}
                        </span>
                        {isPreTagged && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0 gap-0.5 font-semibold">
                            ✦ Previsto
                          </Badge>
                        )}
                        {card.points != null && (
                          <Badge variant="outline" className="text-xs h-5 px-1.5 shrink-0">
                            {card.points}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Sticky footer */}
            <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{committedPoints}</span>{' '}
                pontos comprometidos
              </span>
              <Button
                onClick={handleConfirm}
                disabled={confirming}
              >
                {confirming ? 'Confirmando...' : 'Confirmar Planning'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
