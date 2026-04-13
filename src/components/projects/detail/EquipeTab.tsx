import { useState, useMemo } from 'react';
import { Plus, Trash2, Users, Pencil, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useAuth } from '@/contexts/AuthContext';
import { useProjectAllocations, useRemoveAllocation } from '@/hooks/useProjectRoles';
import { AddAllocationDialog } from '@/components/projects/detail/equipe/AddAllocationDialog';
import { ProjectWithRelations } from '@/types/project';
import { ProjectAllocation } from '@/types/equipe.types';

interface EquipeTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function EquipeTab({ project, isReadOnly = false }: EquipeTabProps) {
  const { employee } = useAuth();
  // FINANCIAL_GUARD: only managers and admins can edit
  const isFinancialVisible = !!(employee?.isAdmin || employee?.is_gerente);
  const canEdit = isFinancialVisible && !isReadOnly;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectAllocation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectAllocation | null>(null);

  const { data: allocations = [], isLoading } = useProjectAllocations(project.id);
  const removeAllocation = useRemoveAllocation(project.id);

  const alreadyAllocatedIds = useMemo(
    () => new Set(allocations.map((a) => a.employeeId)),
    [allocations]
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    removeAllocation.mutate(
      { employeeId: deleteTarget.employeeId },
      { onSuccess: () => setDeleteTarget(null) }
    );
  };

  const totalPlannedHours = allocations.reduce((s, a) => s + a.totalHours, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Equipe</h2>
          {allocations.length > 0 && (
            <Badge variant="secondary">
              {allocations.length} funcionário{allocations.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {/* FINANCIAL_GUARD: button only for PM/Admin */}
        {canEdit && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Alocar Funcionário
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : allocations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhum funcionário alocado</p>
          {canEdit && (
            <p className="mt-1 text-sm text-muted-foreground/70">
              Clique em "Alocar Funcionário" para montar a equipe do projeto.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="text-right">Total de horas</TableHead>
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((alloc) => (
                <TableRow key={alloc.employeeId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{alloc.employee.nome}</p>
                      <p className="text-xs text-muted-foreground">{alloc.employee.cargo}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{alloc.roleName}</span>
                      {!alloc.budgetRoleId && (
                        <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50">
                          Não orçado
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {alloc.totalHours > 0
                      ? `${alloc.totalHours.toLocaleString('pt-BR')}h`
                      : <span className="text-muted-foreground">—</span>
                    }
                  </TableCell>
                  {/* FINANCIAL_GUARD: actions only for PM/Admin */}
                  {canEdit && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditTarget(alloc)}
                            className="gap-2"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar jornada
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget(alloc)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remover alocação
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Footer total */}
          {allocations.length > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
              <span className="text-sm text-muted-foreground">
                Total planejado — {allocations.length} funcionários
              </span>
              <span className="font-mono text-sm font-medium">
                {totalPlannedHours.toLocaleString('pt-BR')}h
              </span>
            </div>
          )}
        </div>
      )}

      {/* Add allocation dialog */}
      <AddAllocationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        project={project}
        alreadyAllocatedIds={alreadyAllocatedIds}
      />

      {/* Edit allocation dialog */}
      {editTarget && (
        <AddAllocationDialog
          open={!!editTarget}
          onOpenChange={(o) => { if (!o) setEditTarget(null); }}
          project={project}
          alreadyAllocatedIds={alreadyAllocatedIds}
          editAllocation={editTarget}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover alocação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{deleteTarget?.employee.nome}</strong> do projeto?
              Todas as horas planejadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeAllocation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
