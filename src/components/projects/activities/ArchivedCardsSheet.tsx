import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArchiveRestore, Search, Trash2, X } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  useArchivedCards,
  useRestoreCard,
  useDeleteCardPermanently,
  ArchivedCardRow,
} from '@/hooks/useActivityCards';
import { useProjectTags } from '@/hooks/useActivityTags';
import { useProjectMembers } from '@/hooks/useProjects';
import {
  ActivityCardType,
  ActivityColumnName,
  CARD_TYPE_LABELS,
  CARD_TYPE_OPTIONS,
  COLUMN_LABELS,
} from '@/types/projectActivity';
import { cn } from '@/lib/utils';

interface ArchivedCardsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  isAdmin: boolean;
  canManage: boolean; // isAdmin || isPM
}

export function ArchivedCardsSheet({
  open,
  onOpenChange,
  projectId,
  isAdmin,
  canManage,
}: ArchivedCardsSheetProps) {
  const { data: archivedCards = [], isLoading } = useArchivedCards(projectId);
  const { data: tags = [] } = useProjectTags(projectId);
  const { data: members = [] } = useProjectMembers(projectId);
  const restoreCard = useRestoreCard();
  const deleteCard = useDeleteCardPermanently();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [pendingDelete, setPendingDelete] = useState<ArchivedCardRow | null>(null);

  const memberOptions = members.filter((m) => m.employee).map((m) => ({
    value: m.employee!.id,
    label: m.employee!.nome,
  }));

  const filtered = archivedCards.filter((c) => {
    const q = search.trim().toLowerCase();
    if (q && !c.title.toLowerCase().includes(q)) return false;
    if (filterType !== 'all' && c.card_type !== filterType) return false;
    if (filterAssignee !== 'all' && c.assignee_id !== filterAssignee) return false;
    return true;
  });

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try { return format(parseISO(d), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
    catch { return d; }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-[560px] p-0 flex flex-col" aria-describedby={undefined}>
          <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <SheetTitle>Cards Arquivados</SheetTitle>
              {archivedCards.length > 0 && (
                <Badge variant="secondary">{archivedCards.length}</Badge>
              )}
            </div>
          </SheetHeader>

          <Separator className="shrink-0" />

          {/* ── Filters ── */}
          <div className="px-4 py-3 flex flex-wrap gap-2 shrink-0">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título..."
                className="h-8 pl-8 text-xs"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os tipos</SelectItem>
                {CARD_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {memberOptions.length > 0 && (
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todos</SelectItem>
                  {memberOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator className="shrink-0" />

          {/* ── Card list ── */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">Carregando...</p>
            ) : filtered.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">
                {archivedCards.length === 0 ? 'Nenhum card arquivado.' : 'Nenhum resultado para os filtros aplicados.'}
              </p>
            ) : (
              <div className="divide-y">
                {filtered.map((card) => (
                  <div key={card.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium leading-snug truncate">{card.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                          {CARD_TYPE_LABELS[card.card_type as ActivityCardType] ?? card.card_type}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {COLUMN_LABELS[card.column_name as ActivityColumnName] ?? card.column_name}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Arquivado em {fmtDate(card.archived_at)}
                        {card.archived_by_employee?.nome && (
                          <> por <span className="font-medium">{card.archived_by_employee.nome}</span></>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Restaurar card"
                          disabled={restoreCard.isPending}
                          onClick={() =>
                            restoreCard.mutate({ id: card.id, projectId, tenantId: card.tenant_id })
                          }
                        >
                          <ArchiveRestore className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir permanentemente"
                          onClick={() => setPendingDelete(card)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Permanent delete confirmation ── */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O card <strong>"{pendingDelete?.title}"</strong> e todo o seu histórico, tarefas e checklists serão excluídos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  deleteCard.mutate(
                    { id: pendingDelete.id, projectId },
                    { onSuccess: () => setPendingDelete(null) }
                  );
                }
              }}
            >
              {deleteCard.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
