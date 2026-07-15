import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Trash2, UserMinus, UserPlus, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { cn } from '@/lib/utils';
import { buildProjectMonths, buildRollingMonths, ProjectMonth } from '@/lib/projectMonths';
import { ProjectWithRelations } from '@/types/project';
import { TeamAllocationRow } from '@/types/equipe.types';
import {
  useTeamAllocationRows,
  useUpdateAllocationHours,
  useSetAllocationMonthHours,
  useDeallocateMember,
  useReactivateMember,
  useRemoveTeamRow,
  useSetVacancyMonthHours,
} from '@/hooks/useProjectRoles';
import { AllocationCell } from '@/components/projects/team/AllocationCell';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

export interface VacancySourceInfo {
  budgetRoleId: string | null;
  customRoleName: string | null;
  vacancyRowId: string | null;
  monthlyHours: { year: number; month: number; plannedHours: number }[];
}

interface TeamAllocationTableProps {
  project: ProjectWithRelations;
  canEdit: boolean;
  isAdmin: boolean;
  currentEmployeeId?: string;
  onAssignVacancy: (vacancy: VacancySourceInfo) => void;
}

export function TeamAllocationTable({ project, canEdit, isAdmin, currentEmployeeId, onAssignVacancy }: TeamAllocationTableProps) {
  const [offsetStart, setOffsetStart] = useState(-3);
  const [showDeallocated, setShowDeallocated] = useState(false);
  const [rowToRemove, setRowToRemove] = useState<TeamAllocationRow | null>(null);

  const { rows, isLoading } = useTeamAllocationRows(project, canEdit, currentEmployeeId);
  const updateHours = useUpdateAllocationHours(project.id);
  const setMonthHours = useSetAllocationMonthHours(project.id);
  const setVacancyMonthHours = useSetVacancyMonthHours(project.id);
  const deallocate = useDeallocateMember(project.id);
  const reactivate = useReactivateMember(project.id);
  const removeRow = useRemoveTeamRow(project.id);

  const today = useMemo(() => new Date(), []);
  const currentMonthIndex = today.getFullYear() * 12 + today.getMonth();

  const months: ProjectMonth[] = useMemo(() => {
    if (project.is_continuous) return buildRollingMonths(today, offsetStart, 10);
    return buildProjectMonths(project.start_date, project.end_date);
  }, [project.is_continuous, project.start_date, project.end_date, offsetStart, today]);

  const activeRows = rows.filter((r) => r.kind === 'member');
  const vacancyRows = rows.filter((r) => r.kind === 'vacancy');
  const deallocatedRows = rows.filter((r) => r.kind === 'deallocated');

  const footerTotals = useMemo(() => {
    const totals: Record<string, { plan: number; real: number }> = {};
    months.forEach((m) => {
      const key = monthKey(m.year, m.month);
      totals[key] = { plan: 0, real: 0 };
    });
    [...activeRows, ...deallocatedRows].forEach((row) => {
      months.forEach((m) => {
        const key = monthKey(m.year, m.month);
        const cell = row.months[key];
        if (!cell) return;
        totals[key].plan += cell.plannedHours;
        totals[key].real += cell.realizedHours ?? 0;
      });
    });
    return totals;
  }, [activeRows, deallocatedRows, months]);

  const handleSaveCell = (
    row: TeamAllocationRow,
    year: number,
    month: number,
    newHours: number,
    reasonCode?: string,
    justification?: string,
  ) => {
    const cell = row.months[monthKey(year, month)];
    if (row.kind === 'vacancy') {
      if (!row.vacancyRowId) return; // vaga orçada não persiste horas fora do orçamento
      setVacancyMonthHours.mutate({ rowId: row.vacancyRowId, year, month, plannedHours: newHours });
      return;
    }
    if (cell?.allocationId) {
      const isPastMonth = year * 12 + (month - 1) < currentMonthIndex;
      updateHours.mutate({
        allocationId: cell.allocationId,
        previousHours: cell.plannedHours,
        newHours,
        isPastMonth,
        reasonCode,
        justification,
      });
      return;
    }
    if (!row.employeeId) return;
    setMonthHours.mutate({
      tenantId: project.tenant_id,
      employeeId: row.employeeId,
      budgetRoleId: row.budgetRoleId,
      customRoleName: row.isUnbudgeted ? row.roleName : null,
      year,
      month,
      plannedHours: newHours,
    });
  };

  const handleAssignVacancy = (row: TeamAllocationRow) => {
    onAssignVacancy({
      budgetRoleId: row.budgetRoleId,
      customRoleName: row.vacancyRowId ? row.roleName : null,
      vacancyRowId: row.vacancyRowId,
      monthlyHours: Object.values(row.months).map((c) => ({ year: c.year, month: c.month, plannedHours: c.plannedHours })),
    });
  };

  const confirmRemove = () => {
    if (!rowToRemove) return;
    if (rowToRemove.kind === 'vacancy') {
      removeRow.mutate({ kind: 'vacancy', vacancyRowId: rowToRemove.vacancyRowId ?? undefined });
    } else if (rowToRemove.employeeId) {
      removeRow.mutate({ kind: 'member', employeeId: rowToRemove.employeeId });
    }
    setRowToRemove(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border bg-card">
        <p className="text-sm text-muted-foreground">Carregando equipe...</p>
      </div>
    );
  }

  const renderRow = (row: TeamAllocationRow) => (
    <tr key={row.key} className={cn('group', row.kind === 'deallocated' && 'opacity-60')}>
      <td className="sticky left-0 z-10 border-r border-t bg-card p-2 align-middle transition-colors group-hover:bg-accent/40">
        <div className="flex items-center gap-2 min-w-0">
          {row.kind === 'vacancy' ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
          ) : (
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initials(row.employee?.nome ?? '?')}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {row.kind === 'vacancy' ? row.roleName : row.employee?.nome}
              {row.employeeId === currentEmployeeId && (
                <span className="ml-1.5 text-[10px] font-semibold normal-case text-primary-deep">você</span>
              )}
            </p>
            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              {row.kind !== 'vacancy' && <span className="truncate">{row.roleName}</span>}
              {row.isUnbudgeted && (
                <Badge variant="outline" className="shrink-0 border-transparent bg-warning/10 px-1.5 py-0 text-[10px] text-warning">
                  Não orçado
                </Badge>
              )}
              {row.kind === 'deallocated' && (
                <span className="shrink-0 text-[10px]">Desalocado</span>
              )}
            </div>
          </div>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {row.kind === 'member' && (
                  <>
                    <DropdownMenuItem onClick={() => row.employeeId && deallocate.mutate(row.employeeId)}>
                      <UserMinus className="mr-2 h-4 w-4" />
                      Desalocar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRowToRemove(row)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
                {row.kind === 'vacancy' && (
                  <>
                    <DropdownMenuItem onClick={() => handleAssignVacancy(row)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Atribuir pessoa
                    </DropdownMenuItem>
                    {row.vacancyRowId && (
                      <DropdownMenuItem onClick={() => setRowToRemove(row)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir linha
                      </DropdownMenuItem>
                    )}
                  </>
                )}
                {row.kind === 'deallocated' && (
                  <DropdownMenuItem onClick={() => row.employeeId && reactivate.mutate(row.employeeId)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Reativar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </td>
      {months.map((m) => {
        const key = monthKey(m.year, m.month);
        const cell = row.months[key];
        const isPastMonth = m.year * 12 + (m.month - 1) < currentMonthIndex;
        const editable = canEdit && row.kind !== 'deallocated' && (!isPastMonth || isAdmin);
        return (
          <td key={key} className="border-r border-t bg-card p-1 align-middle last:border-r-0">
            <AllocationCell
              cell={cell}
              editable={editable}
              isPastMonth={isPastMonth}
              isAdmin={isAdmin}
              onSave={(newHours, reasonCode, justification) => handleSaveCell(row, m.year, m.month, newHours, reasonCode, justification)}
            />
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="space-y-3">
      {project.is_continuous && (
        <div className="flex items-center justify-end gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setOffsetStart((v) => v - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => setOffsetStart((v) => v + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full min-w-[900px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[220px] border-b border-r bg-muted p-3 text-left">
                <span className="ol-label text-muted-foreground">Equipe</span>
              </th>
              {months.map((m) => {
                const isCurrent = m.year * 12 + (m.month - 1) === currentMonthIndex;
                return (
                  <th key={monthKey(m.year, m.month)} className="w-[120px] border-b border-r bg-muted p-2 text-left last:border-r-0">
                    <span className="block text-xs font-semibold uppercase tracking-normal text-foreground">
                      {m.label.replace('.', '')}
                      {isCurrent && <span className="ml-1 text-[10px] font-semibold normal-case text-primary-deep">hoje</span>}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal normal-case text-muted-foreground">
                      planejado / realizado
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {activeRows.length === 0 && vacancyRows.length === 0 && deallocatedRows.length === 0 && (
              <tr>
                <td colSpan={months.length + 1} className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum funcionário alocado ainda.
                </td>
              </tr>
            )}
            {activeRows.map(renderRow)}
            {vacancyRows.map(renderRow)}
            {deallocatedRows.length > 0 && (
              <tr>
                <td colSpan={months.length + 1} className="border-t bg-muted/30 p-0">
                  <button
                    type="button"
                    onClick={() => setShowDeallocated((v) => !v)}
                    className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDeallocated && 'rotate-180')} />
                    {deallocatedRows.length} desalocado{deallocatedRows.length > 1 ? 's' : ''}
                  </button>
                </td>
              </tr>
            )}
            {showDeallocated && deallocatedRows.map(renderRow)}
          </tbody>
          <tfoot>
            <tr className="border-t-2">
              <td className="sticky left-0 z-10 border-r bg-muted/40 p-2 text-xs font-semibold text-foreground">Total</td>
              {months.map((m) => {
                const key = monthKey(m.year, m.month);
                const totals = footerTotals[key];
                return (
                  <td key={key} className="border-r bg-muted/40 p-2 text-center font-mono text-[11px] tabular-nums text-foreground last:border-r-0">
                    {Math.round(totals?.plan ?? 0)}h / {Math.round(totals?.real ?? 0)}h
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <AlertDialog open={Boolean(rowToRemove)} onOpenChange={(open) => !open && setRowToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {rowToRemove?.kind === 'vacancy' ? 'vaga' : rowToRemove?.employee?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {rowToRemove?.kind === 'vacancy'
                ? 'Esta vaga será removida da equipe do projeto.'
                : 'Esta ação só é permitida se não houver horas realizadas. Se houver, desative em vez de excluir.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmRemove}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
