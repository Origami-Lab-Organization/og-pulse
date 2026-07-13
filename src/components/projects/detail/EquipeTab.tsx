import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamAllocationRows } from '@/hooks/useProjectRoles';
import { AddAllocationDialog } from '@/components/projects/detail/equipe/AddAllocationDialog';
import { TeamAllocationTable, VacancySourceInfo } from '@/components/projects/team/TeamAllocationTable';
import { ProjectWithRelations } from '@/types/project';

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
  const [vacancySource, setVacancySource] = useState<VacancySourceInfo | null>(null);

  const { rows } = useTeamAllocationRows(project, canEdit, employee?.id);

  const alreadyAllocatedIds = useMemo(
    () => new Set(rows.filter((r) => r.kind === 'member' && r.employeeId).map((r) => r.employeeId as string)),
    [rows],
  );

  const handleAssignVacancy = (vacancy: VacancySourceInfo) => {
    setVacancySource(vacancy);
    setAddDialogOpen(true);
  };

  const closeDialog = () => {
    setAddDialogOpen(false);
    setTimeout(() => setVacancySource(null), 200);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Equipe</h2>
          <p className="text-sm text-muted-foreground">
            Alocação mês a mês, trazendo horas planejadas / realizadas.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="gap-2 bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90">
            <Plus className="w-4 h-4" />
            Alocar Funcionário
          </Button>
        )}
      </div>

      <TeamAllocationTable
        project={project}
        canEdit={canEdit}
        isAdmin={Boolean(employee?.isAdmin)}
        currentEmployeeId={employee?.id}
        onAssignVacancy={handleAssignVacancy}
      />

      <AddAllocationDialog
        open={addDialogOpen}
        onOpenChange={(open) => (open ? setAddDialogOpen(true) : closeDialog())}
        project={project}
        alreadyAllocatedIds={alreadyAllocatedIds}
        sourceVacancy={vacancySource ?? undefined}
      />
    </div>
  );
}
