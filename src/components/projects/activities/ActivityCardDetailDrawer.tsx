import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { checklistService } from '@/services/checklistService';
import { ChevronLeft, ChevronRight, Tag, Clock, BookOpen, Bug, Wrench, CheckSquare, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { RichTextArea } from '@/components/job-openings/RichTextArea';
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
import { useUpdateActivityCard, useArchiveCard, PreviousCardValues } from '@/hooks/useActivityCards';
import { useDeleteActivity } from '@/hooks/useProjectActivities';
import { useActivityPermissions } from '@/hooks/useActivityPermissions';
import { useActivitySprints } from '@/hooks/useActivitySprints';
import { useProjectReleases } from '@/hooks/useProjectReleases';
import { CardBlockSection } from './CardBlockSection';
import { CardChecklist } from './CardChecklist';
import { CardTaskList } from './CardTaskList';
import { CardHistory } from './CardHistory';
import { TagInput } from './TagInput';
import { cn } from '@/lib/utils';

// ── Fibonacci points ────────────────────────────────────────────────────────
const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21];

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

function getCardCode(projectName: string, cardNumber: number | null): string {
  if (cardNumber == null) return '';
  const prefix = projectName
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  return `${prefix}-${cardNumber}`;
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

// ── Tab trigger style ────────────────────────────────────────────────────────
const triggerCls =
  'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-2 text-sm';

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
  const queryClient = useQueryClient();
  const updateCard = useUpdateActivityCard();
  const archiveCard = useArchiveCard();
  const deleteCard = useDeleteActivity();
  const { isAdmin, canMoveFromDone, canAccessSettings } = useActivityPermissions(project);
  const { data: sprints = [] } = useActivitySprints(project.id);
  const plannedSprints = sprints.filter((s) => s.status === 'planned');
  const { data: releases = [] } = useProjectReleases(project.id);
  const activeReleases = releases.filter((r) => r.status !== 'released');
  const assigneeOptions = (project.members ?? [])
    .filter((m) => !!m.employee?.nome)
    .map((m) => ({ id: m.employee_id, nome: m.employee!.nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const isCardDone = card.column_name === 'done';
  const isFirst = card.column_name === 'product_backlog';
  const disabled = isReadOnly || isCardDone;
  const canNavigate = !isReadOnly;

  // Archive permission: admin always; PM only when card is not in done
  const canArchive = isAdmin || (canAccessSettings && !isCardDone);
  // Delete permission: anyone with edit access (admin always, even when done)
  const canDelete = !isReadOnly && (isAdmin || !isCardDone);

  // ── Local state ────────────────────────────────────────────────────────────
  const [title, setTitle] = useState(card.title);
  const [cardType, setCardType] = useState<ActivityCardType>(card.card_type);
  const [points, setPoints] = useState<number | null>(card.points);
  const [assigneeId, setAssigneeId] = useState<string | null>(card.assignee_id);
  const [releaseId, setReleaseId] = useState<string | null>(card.release_id);
  const [targetSprintId, setTargetSprintId] = useState<string | null>(card.target_sprint_id);
  const [userStory, setUserStory] = useState(card.user_story ?? '');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(card.acceptance_criteria ?? '');
  const [isBlocked, setIsBlocked] = useState(card.is_blocked);
  const [blockedReason, setBlockedReason] = useState(card.blocked_reason ?? '');
  const [blockedError, setBlockedError] = useState('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'detalhes' | 'tarefas' | 'qualidade' | 'historico'>('detalhes');

  // Re-initialize when a different card is opened OR when the underlying card data refreshes
  const prevCardIdRef = useRef<string>('');
  useEffect(() => {
    const isNewCard = card.id !== prevCardIdRef.current;
    prevCardIdRef.current = card.id;
    setTitle(card.title);
    setCardType(card.card_type);
    setPoints(card.points);
    setAssigneeId(card.assignee_id);
    setReleaseId(card.release_id);
    setTargetSprintId(card.target_sprint_id);
    setUserStory(card.user_story ?? '');
    setAcceptanceCriteria(card.acceptance_criteria ?? '');
    setIsBlocked(card.is_blocked);
    setBlockedReason(card.blocked_reason ?? '');
    setBlockedError('');
    if (isNewCard) setActiveTab('detalhes');
  }, [
    card.id,
    card.title,
    card.card_type,
    card.points,
    card.assignee_id,
    card.release_id,
    card.target_sprint_id,
    card.user_story,
    card.acceptance_criteria,
    card.is_blocked,
    card.blocked_reason,
  ]);

  // ── Ensure checklist is up-to-date with project templates ────────────────────
  useEffect(() => {
    if (!open) return;
    checklistService
      .ensureChecklistFromTemplates(card.id, project.id, card.card_type)
      .then((added) => {
        if (added) {
          queryClient.invalidateQueries({ queryKey: ['card-checklist', card.id] });
          queryClient.invalidateQueries({ queryKey: ['project-activities', project.id] });
        }
      })
      .catch(() => {});
  }, [open, card.id]);

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

  const save = saveFields;

  // ── Dirty detection + explicit save ──────────────────────────────────────────
  const trimmedTitle = title.trim();
  const userStoryOrNull = userStory.trim() ? userStory : null;
  const acceptanceCriteriaOrNull = acceptanceCriteria.trim() ? acceptanceCriteria : null;
  const trimmedBlockedReason = blockedReason.trim();
  const blockedReasonForSave = isBlocked ? trimmedBlockedReason : null;

  const isDirty =
    trimmedTitle !== card.title.trim() ||
    cardType !== card.card_type ||
    (points ?? null) !== (card.points ?? null) ||
    (assigneeId ?? null) !== (card.assignee_id ?? null) ||
    (releaseId ?? null) !== (card.release_id ?? null) ||
    (targetSprintId ?? null) !== (card.target_sprint_id ?? null) ||
    userStoryOrNull !== (card.user_story ?? null) ||
    acceptanceCriteriaOrNull !== (card.acceptance_criteria ?? null) ||
    isBlocked !== card.is_blocked ||
    blockedReasonForSave !== (card.blocked_reason ?? null);

  const blockedIncomplete = isBlocked && !trimmedBlockedReason;

  const handleSave = () => {
    if (disabled || !isDirty || !trimmedTitle) return;
    if (blockedIncomplete) {
      setBlockedError('Descreva o impedimento para salvar.');
      return;
    }
    const updates: Parameters<typeof updateCard.mutate>[0]['updates'] = {};
    if (trimmedTitle !== card.title) updates.title = trimmedTitle;
    if (cardType !== card.card_type) updates.cardType = cardType;
    if ((points ?? null) !== (card.points ?? null)) updates.points = points ?? undefined;
    if ((assigneeId ?? null) !== (card.assignee_id ?? null)) updates.assigneeId = assigneeId;
    if ((releaseId ?? null) !== (card.release_id ?? null)) updates.releaseId = releaseId;
    if ((targetSprintId ?? null) !== (card.target_sprint_id ?? null)) updates.targetSprintId = targetSprintId;
    if (userStoryOrNull !== (card.user_story ?? null)) updates.userStory = userStoryOrNull ?? '';
    if (acceptanceCriteriaOrNull !== (card.acceptance_criteria ?? null)) updates.acceptanceCriteria = acceptanceCriteriaOrNull ?? '';
    if (isBlocked !== card.is_blocked) updates.isBlocked = isBlocked;
    if (blockedReasonForSave !== (card.blocked_reason ?? null)) updates.blockedReason = blockedReasonForSave;
    save(updates);
  };

  // ── Column navigation ────────────────────────────────────────────────────────
  const colIndex = ACTIVITY_COLUMNS.indexOf(card.column_name);
  const canGoPrev = !isFirst && !isCardDone && canNavigate;
  const canGoNext = !isCardDone && colIndex < ACTIVITY_COLUMNS.length - 1 && canNavigate;

  const moveColumn = (direction: 'prev' | 'next') => {
    const newCol = ACTIVITY_COLUMNS[direction === 'prev' ? colIndex - 1 : colIndex + 1];
    if (!newCol) return;
    saveColumn(newCol);
  };

  // ── Task count for badge ─────────────────────────────────────────────────────
  const taskTotal = card.card_tasks?.length ?? 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
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
            {(() => {
              const Icon = CARD_TYPE_ICON[card.card_type];
              return (
                <span className={cn('flex items-center gap-1', CARD_TYPE_COLOR[card.card_type])}>
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{CARD_TYPE_LABELS[card.card_type]}</span>
                </span>
              );
            })()}
            {card.card_number != null && (
              <span className="text-xs text-muted-foreground font-mono">
                {getCardCode(project.name, card.card_number)}
              </span>
            )}
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

              {(canArchive || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canArchive && (
                      <DropdownMenuItem
                        className="gap-2"
                        onSelect={() => setArchiveDialogOpen(true)}
                      >
                        <Archive className="h-4 w-4" />
                        Arquivar card
                      </DropdownMenuItem>
                    )}
                    {canArchive && canDelete && <DropdownMenuSeparator />}
                    {canDelete && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive gap-2"
                        onSelect={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir card
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </SheetHeader>

        <Separator />

        {/* ── Done warning — always visible above tabs ── */}
        {isCardDone && (
          <div className="mx-5 mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200 shrink-0">
            <span className="text-xs leading-relaxed">
              Este card está concluído. Mova para <strong>In Deploy</strong> para editar.
            </span>
          </div>
        )}

        {/* ── Tabs ── */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="mx-5 mt-1 shrink-0 justify-start bg-transparent border-b rounded-none gap-1 h-auto pb-0">
            <TabsTrigger value="detalhes"  className={triggerCls}>Detalhes</TabsTrigger>
            <TabsTrigger value="tarefas"   className={triggerCls}>
              Tarefas
              {taskTotal > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {taskTotal}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="qualidade" className={triggerCls}>Qualidade</TabsTrigger>
            <TabsTrigger value="historico" className={triggerCls}>Histórico</TabsTrigger>
          </TabsList>

          {/* ── Detalhes ── */}
          <TabsContent value="detalhes" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden flex flex-col">
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4 space-y-5">

                {/* Tipo + Pontos */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={cardType}
                      onValueChange={(val) => setCardType(val as ActivityCardType)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_TYPE_OPTIONS.map((opt) => {
                          const Icon = CARD_TYPE_ICON[opt.value];
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                <Icon className={cn('h-4 w-4 shrink-0', CARD_TYPE_COLOR[opt.value])} />
                                {opt.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Pontos (Fibonacci)</Label>
                    <Select
                      value={points != null ? points.toString() : '__none__'}
                      onValueChange={(val) => setPoints(val !== '__none__' ? Number(val) : null)}
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

                {/* Responsável */}
                {(() => {
                  const selectedName =
                    (assigneeId === card.assignee_id ? card.assignee?.nome : null)
                    ?? assigneeOptions.find((e) => e.id === assigneeId)?.nome
                    ?? null;
                  return (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Responsável</Label>
                      <Select
                        value={assigneeId ?? '__none__'}
                        onValueChange={(val) => setAssigneeId(val !== '__none__' ? val : null)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Sem responsável">
                            {assigneeId ? (selectedName ?? 'Sem responsável') : 'Sem responsável'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem responsável</SelectItem>
                          {assigneeOptions.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}

                {/* Release */}
                {activeReleases.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Release</Label>
                    <Select
                      value={releaseId ?? '__none__'}
                      onValueChange={(val) => setReleaseId(val !== '__none__' ? val : null)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {activeReleases.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                            {r.version && (
                              <span className="ml-1 text-muted-foreground">({r.version})</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sprint Alvo — only for Product Backlog cards */}
                {card.column_name === 'product_backlog' && plannedSprints.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sprint Alvo</Label>
                    <Select
                      value={targetSprintId ?? '__none__'}
                      onValueChange={(val) => setTargetSprintId(val !== '__none__' ? val : null)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {plannedSprints.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                            {' '}
                            <span className="text-muted-foreground">
                              ({format(parseISO(s.start_date), 'dd/MM', { locale: ptBR })} – {format(parseISO(s.end_date), 'dd/MM', { locale: ptBR })})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Tags
                  </Label>
                  <TagInput projectId={project.id} cardId={card.id} disabled={disabled} />
                </div>

                <Separator />

                {/* User Story */}
                <div className="space-y-1.5">
                  <Label className="text-xs">User Story</Label>
                  <RichTextArea
                    value={userStory}
                    onChange={setUserStory}
                    disabled={disabled}
                    placeholder="Como [ator], quero [ação] para [benefício]..."
                    minHeight="120px"
                  />
                </div>

                {/* Critérios de Aceitação */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Critérios de Aceitação</Label>
                  <RichTextArea
                    value={acceptanceCriteria}
                    onChange={setAcceptanceCriteria}
                    disabled={disabled}
                    placeholder="Dado que... quando... então..."
                    minHeight="120px"
                  />
                </div>

                <Separator />

                {/* Bloqueio */}
                <CardBlockSection
                  blocked={isBlocked}
                  reason={blockedReason}
                  disabled={disabled}
                  error={blockedError}
                  onChange={(b, r) => {
                    setIsBlocked(b);
                    setBlockedReason(r);
                    if (blockedError && (!b || r.trim())) setBlockedError('');
                  }}
                />

              </div>
            </ScrollArea>

            {!isReadOnly && (
              <div className="border-t px-5 py-3 flex items-center justify-end gap-3 shrink-0 bg-background">
                {isDirty && (
                  <span className="text-xs text-muted-foreground mr-auto">
                    Alterações não salvas
                  </span>
                )}
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={disabled || !isDirty || !trimmedTitle || updateCard.isPending}
                >
                  {updateCard.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ── Tarefas ── */}
          <TabsContent value="tarefas" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-5 py-4">
                <CardTaskList cardId={card.id} project={project} tenantId={card.tenant_id} disabled={disabled} />
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Qualidade ── */}
          <TabsContent value="qualidade" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-5 py-4 space-y-5">
                <Section title="Definition of Ready">
                  <CardChecklist
                    cardId={card.id}
                    cardTenantId={card.tenant_id}
                    type="dor"
                    isReadOnly={false}
                  />
                </Section>
                <Separator />
                <Section title="Definition of Done">
                  <CardChecklist
                    cardId={card.id}
                    cardTenantId={card.tenant_id}
                    type="dod"
                    isReadOnly={false}
                  />
                </Section>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Histórico ── */}
          <TabsContent value="historico" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden">
            <ScrollArea className="h-full">
              <div className="px-5 py-4">
                <CardHistory cardId={card.id} />
              </div>
            </ScrollArea>
          </TabsContent>

        </Tabs>
      </SheetContent>
    </Sheet>

    <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arquivar card?</AlertDialogTitle>
          <AlertDialogDescription>
            O card será removido do board e não poderá ser desfeito por aqui. Você pode acessar cards arquivados nas configurações do projeto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              archiveCard.mutate(
                { id: card.id, projectId: project.id, tenantId: card.tenant_id },
                { onSuccess: () => onOpenChange(false) }
              );
            }}
          >
            {archiveCard.isPending ? 'Arquivando...' : 'Arquivar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir card?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente e não pode ser desfeita. Todos os dados do card (tarefas, checklists, histórico) serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              deleteCard.mutate(
                { id: card.id, projectId: project.id },
                { onSuccess: () => onOpenChange(false) }
              );
            }}
          >
            {deleteCard.isPending ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
