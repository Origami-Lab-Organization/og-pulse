import { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
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
import { useProjectRoles, useDeleteProjectRole } from '@/hooks/useProjectRoles';
import { AddRoleDialog } from '@/components/projects/detail/equipe/AddRoleDialog';
import { ProjectWithRelations } from '@/types/project';
import { ProjectRoleWithEmployee, EMPLOYMENT_TYPE_LABELS, EMPLOYMENT_TYPE_BADGE_COLORS } from '@/types/equipe.types';
import { formatCurrency } from '@/lib/formatters';

interface EquipeTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

function RoleRateLabel(role: ProjectRoleWithEmployee, isFinancialVisible: boolean): string | null {
  if (!isFinancialVisible) return null;
  if (role.payment_type === 'hourly' && role.hourly_rate) {
    return `${formatCurrency(role.hourly_rate)}/h`;
  }
  if (role.payment_type === 'monthly' && role.monthly_rate) {
    return `${formatCurrency(role.monthly_rate)}/mês`;
  }
  if (role.payment_type === 'delivery' && role.monthly_rate) {
    return `${formatCurrency(role.monthly_rate)} (entrega)`;
  }
  return null;
}

function PersonLabel(role: ProjectRoleWithEmployee): string {
  if (role.employee) return role.employee.nome;
  if (role.freelancer_name) return role.freelancer_name;
  return '—';
}

export function EquipeTab({ project, isReadOnly = false }: EquipeTabProps) {
  const { employee } = useAuth();
  // FINANCIAL_GUARD: Only managers and admins see financial data
  const isFinancialVisible = !!(employee?.isAdmin || employee?.is_gerente);
  const canEdit = isFinancialVisible && !isReadOnly;

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRoleWithEmployee | null>(null);

  const { data: roles = [], isLoading } = useProjectRoles(project.id);
  const deleteRole = useDeleteProjectRole(project.id);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteRole.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Equipe do Projeto</h2>
          {roles.length > 0 && (
            <Badge variant="secondary">{roles.length} papel{roles.length !== 1 ? 'éis' : ''}</Badge>
          )}
        </div>
        {/* FINANCIAL_GUARD: "+ Adicionar Papel" only for PM/Admin */}
        {canEdit && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Papel
          </Button>
        )}
      </div>

      {/* Roles table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-muted-foreground">Nenhum papel cadastrado</p>
          {canEdit && (
            <p className="mt-1 text-sm text-muted-foreground/70">
              Clique em "Adicionar Papel" para definir a equipe do projeto.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Papel</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Pagamento</TableHead>
                {/* FINANCIAL_GUARD: Rate column only for PM/Admin */}
                {isFinancialVisible && <TableHead className="text-right">Taxa</TableHead>}
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => {
                const rateLabel = RoleRateLabel(role, isFinancialVisible);
                const paymentLabel =
                  role.payment_type === 'hourly' ? 'Por hora' :
                  role.payment_type === 'monthly' ? 'Mensal fixo' : 'Por entrega';

                return (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.role_name}</TableCell>
                    <TableCell className="text-muted-foreground">{PersonLabel(role)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={EMPLOYMENT_TYPE_BADGE_COLORS[role.employment_type]}
                      >
                        {EMPLOYMENT_TYPE_LABELS[role.employment_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{paymentLabel}</TableCell>
                    {/* FINANCIAL_GUARD */}
                    {isFinancialVisible && (
                      <TableCell className="text-right font-mono text-sm">
                        {rateLabel ?? '—'}
                        {role.employment_type === 'CLT' && role.clt_encargos_multiplier && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ×{role.clt_encargos_multiplier}
                          </span>
                        )}
                      </TableCell>
                    )}
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(role)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add role dialog */}
      <AddRoleDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        projectId={project.id}
        projectStartDate={project.start_date}
        projectEndDate={project.end_date}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover papel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o papel{' '}
              <strong>{deleteTarget?.role_name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRole.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
