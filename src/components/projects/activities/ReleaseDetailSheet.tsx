import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, Trash2 } from 'lucide-react';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  ProjectReleaseWithSprints,
  ReleaseStatus,
  UpdateReleaseInput,
  RELEASE_STATUS_CLASSES,
  RELEASE_STATUS_LABELS,
} from '@/types/projectRelease';
import {
  useDeleteRelease,
  useSetReleaseSprints,
  useUpdateRelease,
} from '@/hooks/useProjectReleases';
import {
  ActivityColumnName,
  ActivitySprintDB,
  COLUMN_LABELS,
  ProjectActivityCardWithRelations,
} from '@/types/projectActivity';
import { cn } from '@/lib/utils';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReleaseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: ProjectReleaseWithSprints;
  projectId: string;
  sprints: ActivitySprintDB[];
  cards: ProjectActivityCardWithRelations[];
  canManage: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReleaseDetailSheet({
  open,
  onOpenChange,
  release,
  projectId,
  sprints,
  cards,
  canManage,
}: ReleaseDetailSheetProps) {
  const updateRelease   = useUpdateRelease();
  const deleteRelease   = useDeleteRelease();
  const setSprintsHook  = useSetReleaseSprints();

  // ── Local state ────────────────────────────────────────────────────────────
  const [name,        setName]        = useState(release.name);
  const [version,     setVersion]     = useState(release.version ?? '');
  const [description, setDescription] = useState(release.description ?? '');
  const [targetDate,  setTargetDate]  = useState(release.target_date);
  const [releasedAt,  setReleasedAt]  = useState(release.released_at ?? '');
  const [selectedSprints, setSelectedSprints] = useState<Set<string>>(
    new Set(release.release_sprints.map((rs) => rs.sprint_id)),
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Re-init when release changes
  useEffect(() => {
    setName(release.name);
    setVersion(release.version ?? '');
    setDescription(release.description ?? '');
    setTargetDate(release.target_date);
    setReleasedAt(release.released_at ?? '');
    setSelectedSprints(new Set(release.release_sprints.map((rs) => rs.sprint_id)));
  }, [release.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const save = (updates: UpdateReleaseInput) => {
    updateRelease.mutate({ id: release.id, projectId, updates });
  };

  const handleSaveFields = () => {
    save({
      name:        name.trim() || release.name,
      version:     version.trim() || null,
      description: description.trim() || null,
      targetDate,
    });
  };

  const handleStatusChange = (status: ReleaseStatus) => {
    if (status === 'released') {
      const today = new Date().toISOString().slice(0, 10);
      if (!releasedAt) setReleasedAt(today);
      save({ status, releasedAt: releasedAt || today });
    } else {
      save({ status });
    }
  };

  const handleSprintToggle = (sprintId: string) => {
    const next = new Set(selectedSprints);
    if (next.has(sprintId)) next.delete(sprintId);
    else next.add(sprintId);
    setSelectedSprints(next);
    setSprintsHook.mutate({ releaseId: release.id, projectId, sprintIds: [...next] });
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const releaseCards = cards.filter((c) => c.release_id === release.id);
  const totalPts = releaseCards.reduce((s, c) => s + (c.points ?? 0), 0);
  const donePts  = releaseCards
    .filter((c) => c.column_name === 'done')
    .reduce((s, c) => s + (c.points ?? 0), 0);
  const pct = totalPts > 0 ? Math.round((donePts / totalPts) * 100) : 0;

  const sprintById = Object.fromEntries(sprints.map((s) => [s.id, s]));
  const cardsBySprint: Record<string, ProjectActivityCardWithRelations[]> = {};
  const cardsNoSprint: ProjectActivityCardWithRelations[] = [];
  for (const card of releaseCards) {
    if (card.sprint_id && sprintById[card.sprint_id]) {
      (cardsBySprint[card.sprint_id] ??= []).push(card);
    } else {
      cardsNoSprint.push(card);
    }
  }

  const STATUS_OPTS: ReleaseStatus[] = ['planned', 'in_progress', 'released'];
  const otherStatuses = STATUS_OPTS.filter((s) => s !== release.status);

  const fmtDate = (d: string) => {
    try { return format(parseISO(d), 'dd/MM', { locale: ptBR }); } catch { return d; }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[600px] p-0 flex flex-col"
          aria-describedby={undefined}
        >
          {/* ── Header ── */}
          <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1">
                <SheetTitle className="text-base font-semibold leading-snug">
                  {release.name}
                  {release.version && (
                    <span className="ml-2 text-sm font-mono text-muted-foreground">
                      {release.version}
                    </span>
                  )}
                </SheetTitle>
                <Badge
                  variant="secondary"
                  className={cn('text-[10px] h-4 px-1.5 border-0', RELEASE_STATUS_CLASSES[release.status])}
                >
                  {RELEASE_STATUS_LABELS[release.status]}
                </Badge>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canManage && otherStatuses.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                        Alterar status
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {otherStatuses.map((s) => (
                        <DropdownMenuItem key={s} onSelect={() => handleStatusChange(s)}>
                          {RELEASE_STATUS_LABELS[s]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <Separator />

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-6">

              {/* ── Métricas ── */}
              <div className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Progresso</span>
                  <span className="text-sm font-semibold">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    <strong className="text-foreground">{donePts}</strong> pts entregues
                  </span>
                  <span>
                    <strong className="text-foreground">{totalPts}</strong> pts totais
                  </span>
                  <span>
                    <strong className="text-foreground">{releaseCards.length}</strong> cards
                  </span>
                </div>
              </div>

              {/* ── Detalhes ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalhes
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canManage}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Versão</Label>
                    <Input
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      disabled={!canManage}
                      placeholder="ex: v1.2.0"
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data alvo</Label>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      disabled={!canManage}
                      className="h-8 text-sm"
                    />
                  </div>
                  {release.status === 'released' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data de lançamento</Label>
                      <Input
                        type="date"
                        value={releasedAt}
                        onChange={(e) => {
                          setReleasedAt(e.target.value);
                          save({ releasedAt: e.target.value || null });
                        }}
                        disabled={!canManage}
                        className="h-8 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canManage}
                    placeholder="Descreva o escopo e objetivos desta release..."
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>

                {canManage && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={handleSaveFields}
                    disabled={updateRelease.isPending}
                  >
                    {updateRelease.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                )}
              </div>

              <Separator />

              {/* ── Sprints ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sprints Associadas
                </p>

                {sprints.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma sprint criada neste projeto.
                  </p>
                ) : (
                  <div className="space-y-0.5">
                    {sprints.map((sprint) => {
                      const checked = selectedSprints.has(sprint.id);
                      return (
                        <label
                          key={sprint.id}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 transition-colors',
                            canManage ? 'cursor-pointer' : 'cursor-default',
                            checked ? 'bg-primary/5' : canManage && 'hover:bg-muted/50',
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => canManage && handleSprintToggle(sprint.id)}
                            disabled={!canManage}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{sprint.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {fmtDate(sprint.start_date)} – {fmtDate(sprint.end_date)}
                              {sprint.status === 'active' && (
                                <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                  · Ativa
                                </span>
                              )}
                              {sprint.status === 'completed' && (
                                <span className="ml-1.5 font-medium">· Concluída</span>
                              )}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Cards ── */}
              {releaseCards.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cards ({releaseCards.length})
                    </p>

                    {/* Grouped by sprint */}
                    {[...selectedSprints].map((sid) => {
                      const sprint     = sprintById[sid];
                      const grpCards   = cardsBySprint[sid] ?? [];
                      if (!sprint || grpCards.length === 0) return null;
                      return (
                        <div key={sid} className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">{sprint.name}</p>
                          {grpCards.map((card) => (
                            <CardRow key={card.id} card={card} />
                          ))}
                        </div>
                      );
                    })}

                    {cardsNoSprint.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Sem sprint</p>
                        {cardsNoSprint.map((card) => (
                          <CardRow key={card.id} card={card} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Confirm delete ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir release?</AlertDialogTitle>
            <AlertDialogDescription>
              A release <strong>"{release.name}"</strong> será excluída permanentemente. Os cards
              associados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteRelease.mutate(
                  { id: release.id, projectId },
                  {
                    onSuccess: () => {
                      setDeleteOpen(false);
                      onOpenChange(false);
                    },
                  },
                )
              }
            >
              {deleteRelease.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Card row (internal) ───────────────────────────────────────────────────────

function CardRow({ card }: { card: ProjectActivityCardWithRelations }) {
  return (
    <div className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md border border-border">
      <span className="flex-1 leading-snug line-clamp-1">{card.title}</span>
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
        {COLUMN_LABELS[card.column_name as ActivityColumnName]}
      </Badge>
      {card.points != null && (
        <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
          {card.points}
        </Badge>
      )}
    </div>
  );
}
