import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Tag, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ProjectActivityCardWithRelations,
  ActivityCardType,
  ActivityColumnName,
  CARD_TYPE_LABELS,
  CARD_TYPE_OPTIONS,
  COLUMN_LABELS,
  ACTIVITY_COLUMNS,
} from '@/types/projectActivity';
import { ProjectWithRelations } from '@/types/project';
import { useUpdateActivityCard, PreviousCardValues } from '@/hooks/useActivityCards';
import { useActivityPermissions } from '@/hooks/useActivityPermissions';
import { CardBlockSection } from './CardBlockSection';
import { CardChecklist } from './CardChecklist';
import { CardTaskList } from './CardTaskList';
import { CardHistory } from './CardHistory';
import { cn } from '@/lib/utils';

// ── Fibonacci points ────────────────────────────────────────────────────────
const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

const CARD_TYPE_BADGE: Record<ActivityCardType, string> = {
  story: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0',
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0',
  tech_debt: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0',
  task: 'bg-secondary text-secondary-foreground border-0',
};

// ── useDebounce ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface ActivityCardDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ProjectActivityCardWithRelations;
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ActivityCardDetailDrawer({
  open,
  onOpenChange,
  card,
  project,
  isReadOnly = false,
}: ActivityCardDetailDrawerProps) {
  const updateCard = useUpdateActivityCard();
  const { canMoveFromDone } = useActivityPermissions(project);
  const members = project.members ?? [];
  const isCardDone = card.column_name === 'done';
  const isFirst = card.column_name === 'product_backlog';
  // Fields are read-only when card is Done or project is read-only
  const disabled = isReadOnly || isCardDone;
  const canNavigate = !isReadOnly;

  // ── Local state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(card.title);
  const [userStory, setUserStory] = useState(card.user_story ?? '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(card.acceptance_criteria ?? '');
  const [blockedReason, setBlockedReason] = useState(card.blocked_reason ?? '');

  // Re-initialize when a different card is opened
  const prevCardIdRef = useRef<string>('');
  useEffect(() => {
    if (card.id !== prevCardIdRef.current) {
      prevCardIdRef.current = card.id;
      setTitle(card.title);
      setUserStory(card.user_story ?? '');
      setAcceptanceCriteria(card.acceptance_criteria ?? '');
      setBlockedReason(card.blocked_reason ?? '');
    }
  }, [card.id, card.title, card.user_story, card.acceptance_criteria, card.blocked_reason]);

  // ── Debounced values ────────────────────────────────────────────────────────
  const debouncedTitle = useDebounce(title, 1000);
  const debouncedUserStory = useDebounce(userStory, 1000);
  const debouncedAcceptanceCriteria = useDebounce(acceptanceCriteria, 1000);
  const debouncedBlockedReason = useDebounce(blockedReason, 1000);

  // ── Save helper ─────────────────────────────────────────────────────────────
  const previousCard = (): PreviousCardValues => ({
    title: card.title,
    card_type: card.card_type,
    points: card.points,
    assignee_id: card.assignee_id,
    user_story: card.user_story,
    acceptance_criteria: card.acceptance_criteria,
    is_blocked: card.is_blocked,
    blocked_reason: card.blocked_reason,
  });

  // saveFields: only for content edits, blocked when card is Done or isReadOnly
  const saveFields = (updates: Parameters<typeof updateCard.mutate>[0]['updates']) => {
    if (disabled) return;
    updateCard.mutate({
      id: card.id,
      projectId: project.id,
      tenantId: card.tenant_id,
      updates,
      previousCard: previousCard(),
    });
  };

  // saveColumn: always allowed unless isReadOnly (enables moving out of Done)
  const saveColumn = (columnName: ActivityColumnName) => {
    if (isReadOnly) return;
    updateCard.mutate({
      id: card.id,
      projectId: project.id,
      tenantId: card.tenant_id,
      updates: { columnName },
      previousCard: previousCard(),
    });
  };

  // alias for field saves
  const save = saveFields;

  // ── Auto-save effects ────────────────────────────────────────────────────────
  const mountedRef = useRef(false);
  useEffect(() => {
    // skip first render
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (debouncedTitle !== card.title) save({ title: debouncedTitle });
  }, [debouncedTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const val = debouncedUserStory || null;
    if (val !== (card.user_story ?? null)) save({ userStory: debouncedUserStory });
  }, [debouncedUserStory]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const val = debouncedAcceptanceCriteria || null;
    if (val !== (card.acceptance_criteria ?? null)) save({ acceptanceCriteria: debouncedAcceptanceCriteria });
  }, [debouncedAcceptanceCriteria]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const val = debouncedBlockedReason || null;
    if (val !== (card.blocked_reason ?? null)) save({ blockedReason: debouncedBlockedReason || null });
  }, [debouncedBlockedReason]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Column navigation ────────────────────────────────────────────────────────
  const colIndex = ACTIVITY_COLUMNS.indexOf(card.column_name);
  // ← disabled when product_backlog or done (done has its own "Reabrir" button)
  const canGoPrev = !isFirst && !isCardDone && canNavigate;
  // → disabled when done
  const canGoNext = !isCardDone && colIndex < ACTIVITY_COLUMNS.length - 1 && canNavigate;

  const moveColumn = (direction: 'prev' | 'next') => {
    const newCol = ACTIVITY_COLUMNS[direction === 'prev' ? colIndex - 1 : colIndex + 1];
    if (!newCol) return;
    saveColumn(newCol);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col" aria-describedby={undefined}>

        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-3 space-y-3 shrink-0">
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
            className="text-base font-semibold border-0 shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent"
            placeholder="Título do card"
          />

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', CARD_TYPE_BADGE[card.card_type])}>
              {CARD_TYPE_LABELS[card.card_type]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {COLUMN_LABELS[card.column_name]}
            </Badge>
            {card.sprint_id && (
              <Badge variant="secondary" className="text-xs">Sprint</Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground ml-1">
              <Clock className="h-3 w-3" />
              {card.created_at ? format(parseISO(card.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '—'}
            </span>

            <div className="flex items-center gap-1 ml-auto">
              {/* "← Reabrir" aparece apenas em Done para Admin/PM; substitui o ← normal */}
              {isCardDone && canMoveFromDone ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => saveColumn('in_deploy')}
                  title="Mover para In Deploy"
                >
                  ← Reabrir
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={!canGoPrev}
                  onClick={() => moveColumn('prev')}
                  title={canGoPrev ? `← ${COLUMN_LABELS[ACTIVITY_COLUMNS[colIndex - 1]]}` : undefined}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!canGoNext}
                onClick={() => moveColumn('next')}
                title={canGoNext ? `→ ${COLUMN_LABELS[ACTIVITY_COLUMNS[colIndex + 1]]}` : undefined}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Done warning ── */}
        {isCardDone && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
            <span className="text-xs leading-relaxed">
              Este card está concluído. Mova para <strong>In Deploy</strong> para editar.
            </span>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-4 space-y-6">

            {/* ── Informações ── */}
            <Section title="Informações">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={card.card_type}
                    onValueChange={(val) => save({ cardType: val as ActivityCardType })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CARD_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Pontos (Fibonacci)</Label>
                  <Select
                    value={card.points != null ? card.points.toString() : '__none__'}
                    onValueChange={(val) => save({ points: val !== '__none__' ? Number(val) : undefined })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem estimativa</SelectItem>
                      {FIBONACCI_POINTS.map((p) => (
                        <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Responsável</Label>
                  <Select
                    value={card.assignee_id ?? '__none__'}
                    onValueChange={(val) => save({ assigneeId: val !== '__none__' ? val : null })}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Sem responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem responsável</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.employee_id} value={m.employee_id}>
                          {m.employee?.nome ?? m.employee_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* ACT-05 — Tags (placeholder) */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </Label>
                <div className="flex items-center h-8 px-3 rounded-md border border-input bg-background text-xs text-muted-foreground">
                  Tags — em breve
                </div>
              </div>
            </Section>

            <Separator />

            {/* ── Detalhamento ── */}
            <Section title="Detalhamento">
              <div className="space-y-1.5">
                <Label className="text-xs">User Story</Label>
                <Textarea
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  disabled={disabled}
                  placeholder="Como [ator], quero [ação] para [benefício]..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Critérios de Aceitação</Label>
                <Textarea
                  value={acceptanceCriteria}
                  onChange={(e) => setAcceptanceCriteria(e.target.value)}
                  disabled={disabled}
                  placeholder="Dado que... quando... então..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </Section>

            <Separator />

            {/* ── Bloqueio ── */}
            <Section title="Bloqueio">
              <CardBlockSection
                isBlocked={card.is_blocked}
                blockedReason={blockedReason}
                disabled={disabled}
                onBlockedChange={(val) => save({ isBlocked: val })}
                onReasonChange={setBlockedReason}
              />
            </Section>

            <Separator />

            {/* ── DoR / DoD ── */}
            <Section title="DoR / DoD">
              <CardChecklist cardId={card.id} disabled={disabled} />
            </Section>

            <Separator />

            {/* ── Tarefas ── */}
            <Section title="Tarefas">
              <CardTaskList cardId={card.id} disabled={disabled} />
            </Section>

            <Separator />

            {/* ── Histórico ── */}
            <Section title="Histórico">
              <CardHistory cardId={card.id} />
            </Section>

          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
