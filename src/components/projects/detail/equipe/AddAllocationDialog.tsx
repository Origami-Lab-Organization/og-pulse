import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { buildProjectMonths } from '@/lib/projectMonths';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjectBudgetRoles } from '@/hooks/useProjectBudgetRoles';
import { useAddAllocation, useProjectAllocations } from '@/hooks/useProjectRoles';
import { useAllocationImpact } from '@/hooks/useAllocationImpact';
import { equipeService } from '@/services/equipeService';
import { useQueryClient } from '@tanstack/react-query';
import { AddAllocationPayload, ProjectAllocation, SimulationMonth } from '@/types/equipe.types';
import { ProjectWithRelations } from '@/types/project';
import { AllocationComposer, RoleSelection } from '@/components/projects/detail/equipe/AllocationComposer';
import { AvailabilityPanel } from '@/components/projects/detail/equipe/AvailabilityPanel';
import { MarginImpactPanel } from '@/components/projects/detail/equipe/MarginImpactPanel';
import type { VacancySourceInfo } from '@/components/projects/team/TeamAllocationTable';

interface AddAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations;
  alreadyAllocatedIds: Set<string>;
  /** Edição de uma alocação existente (pessoa e papel travados). */
  editAllocation?: ProjectAllocation;
  /** Vindo do CTA de uma vaga: papel pré-selecionado, horas pré-preenchidas. */
  sourceVacancy?: VacancySourceInfo;
  /** Painel de margem visível só para admin/GP do projeto (§5.3). */
  canSeeMargin?: boolean;
}

function toNumberMap(hours: Record<string, string>): Record<string, number> {
  const out: Record<string, number> = {};
  Object.entries(hours).forEach(([k, v]) => {
    out[k] = Math.max(0, parseFloat(v || '0') || 0);
  });
  return out;
}

export function AddAllocationDialog({
  open,
  onOpenChange,
  project,
  alreadyAllocatedIds,
  editAllocation,
  sourceVacancy,
  canSeeMargin = true,
}: AddAllocationDialogProps) {
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { budgetRoles } = useProjectBudgetRoles(project.budget_id, project.id);
  const { data: projectAllocations = [] } = useProjectAllocations(project.id, false);

  const projectMonths = useMemo(
    () => buildProjectMonths(project.start_date, project.end_date),
    [project.start_date, project.end_date],
  );

  const isEdit = !!editAllocation;

  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState<RoleSelection>({ useCustom: false, budgetRoleId: '', customRoleName: '' });
  const [hours, setHours] = useState<Record<string, string>>({});

  // (Re)inicializa o estado quando o dialog abre.
  useEffect(() => {
    if (!open) return;
    const seedHours: Record<string, string> = {};
    projectMonths.forEach((pm) => (seedHours[`${pm.year}-${pm.month}`] = '0'));

    if (editAllocation) {
      setEmployeeId(editAllocation.employeeId);
      setRole({
        useCustom: !editAllocation.budgetRoleId,
        budgetRoleId: editAllocation.budgetRoleId ?? '',
        customRoleName: editAllocation.customRoleName ?? '',
      });
      editAllocation.monthlyHours.forEach((mh) => (seedHours[`${mh.year}-${mh.month}`] = String(mh.plannedHours)));
    } else if (sourceVacancy) {
      setEmployeeId('');
      setRole({
        useCustom: !sourceVacancy.budgetRoleId,
        budgetRoleId: sourceVacancy.budgetRoleId ?? '',
        customRoleName: sourceVacancy.customRoleName ?? '',
      });
      sourceVacancy.monthlyHours.forEach((mh) => (seedHours[`${mh.year}-${mh.month}`] = String(mh.plannedHours)));
    } else {
      setEmployeeId('');
      setRole({ useCustom: false, budgetRoleId: '', customRoleName: '' });
    }
    setHours(seedHours);
  }, [open, editAllocation, sourceVacancy, projectMonths]);

  const selectedBudgetRole = useMemo(
    () => (role.budgetRoleId ? budgetRoles.find((r) => r.id === role.budgetRoleId) ?? null : null),
    [role.budgetRoleId, budgetRoles],
  );

  // Pré-preenche horas do papel orçado quando ele é escolhido do zero.
  useEffect(() => {
    if (isEdit || sourceVacancy || !selectedBudgetRole) return;
    const allZero = projectMonths.every((pm) => !(parseFloat(hours[`${pm.year}-${pm.month}`] || '0') > 0));
    if (!allZero) return;
    const next: Record<string, string> = { ...hours };
    projectMonths.forEach((pm) => {
      const bm = selectedBudgetRole.months.find((m) => m.month_number === pm.monthNumber);
      next[`${pm.year}-${pm.month}`] = bm ? String(bm.hours) : '0';
    });
    setHours(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBudgetRole?.id]);

  const allocatedByBudgetRole = useMemo(() => {
    const map = new Map<string, string[]>();
    projectAllocations.forEach((alloc) => {
      if (!alloc.budgetRoleId) return;
      const names = map.get(alloc.budgetRoleId) ?? [];
      names.push(alloc.employee.nome);
      map.set(alloc.budgetRoleId, names);
    });
    return map;
  }, [projectAllocations]);

  const hoursNum = useMemo(() => toNumberMap(hours), [hours]);
  const composedMonths = useMemo<SimulationMonth[]>(
    () =>
      projectMonths.map((pm) => ({
        year: pm.year,
        month: pm.month,
        hours: hoursNum[`${pm.year}-${pm.month}`] ?? 0,
      })),
    [projectMonths, hoursNum],
  );
  const totalComposed = composedMonths.reduce((s, m) => s + m.hours, 0);

  const {
    data: impact,
    isLoading: impactLoading,
    isError: impactError,
  } = useAllocationImpact({
    projectId: project.id,
    employeeId,
    months: composedMonths,
    enabled: canSeeMargin,
  });

  // Nota de vaga orçada: papel orçado e horas compostas ≤ horas orçadas.
  const showBudgetedRoleNote = useMemo(() => {
    if (role.useCustom || !selectedBudgetRole) return false;
    const budgeted = selectedBudgetRole.months.reduce((s, m) => s + Number(m.hours), 0);
    return budgeted > 0 && totalComposed <= budgeted;
  }, [role.useCustom, selectedBudgetRole, totalComposed]);

  const employeeName = employees.find((e) => e.id === employeeId)?.nome;
  const lockedRoleLabel = sourceVacancy
    ? sourceVacancy.customRoleName ||
      budgetRoles.find((r) => r.id === sourceVacancy.budgetRoleId)?.role_name ||
      'Papel da vaga'
    : null;

  const roleValid = isEdit || !!sourceVacancy || (role.useCustom ? role.customRoleName.trim().length >= 2 : !!role.budgetRoleId);
  const canSubmit = !!employeeId && roleValid && totalComposed > 0;

  const handleClose = () => onOpenChange(false);

  const handleAllocationSuccess = () => {
    if (sourceVacancy?.vacancyRowId) {
      equipeService.deleteTeamRow(sourceVacancy.vacancyRowId).finally(() => {
        queryClient.invalidateQueries({ queryKey: ['project-team-rows', project.id] });
      });
    }
    handleClose();
  };

  const addAllocation = useAddAllocation(project.id, handleAllocationSuccess);

  const handleSubmit = () => {
    const payload: AddAllocationPayload = {
      projectId: project.id,
      tenantId: project.tenant_id,
      employeeId,
      budgetRoleId: role.useCustom ? undefined : role.budgetRoleId || sourceVacancy?.budgetRoleId || undefined,
      customRoleName: role.useCustom ? role.customRoleName.trim() : sourceVacancy?.customRoleName || undefined,
      monthlyHours: composedMonths.map((m) => ({ year: m.year, month: m.month, plannedHours: m.hours })),
    };
    addAllocation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar alocação' : 'Nova alocação'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Coluna esquerda — composição */}
          <AllocationComposer
            tenantId={project.tenant_id}
            projectMonths={projectMonths}
            employees={employees
              .filter((e) => e.alocaEmProjetos)
              .map((e) => ({ id: e.id, nome: e.nome, cargo: e.cargo }))}
            budgetRoles={budgetRoles}
            alreadyAllocatedIds={alreadyAllocatedIds}
            allocatedByBudgetRole={allocatedByBudgetRole}
            lockedRoleLabel={lockedRoleLabel}
            isEdit={isEdit}
            employeeId={employeeId}
            onSelectEmployee={setEmployeeId}
            role={role}
            onRoleChange={setRole}
            hours={hours}
            onHoursChange={setHours}
          />

          {/* Coluna direita — painéis de decisão */}
          <div className="space-y-4">
            {employeeId ? (
              <AvailabilityPanel
                tenantId={project.tenant_id}
                employeeId={employeeId}
                projectId={project.id}
                projectMonths={projectMonths}
                hoursByKey={hoursNum}
                savedThisProjectHours={
                  editAllocation
                    ? Object.fromEntries(editAllocation.monthlyHours.map((mh) => [`${mh.year}-${mh.month}`, mh.plannedHours]))
                    : {}
                }
              />
            ) : (
              <section className="rounded-lg border bg-card">
                <div className="border-b bg-muted/50 px-4 py-2">
                  <p className="ol-label text-muted-foreground">Disponibilidade</p>
                </div>
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Selecione um funcionário para ver a disponibilidade.
                </p>
              </section>
            )}

            {canSeeMargin && (
              <MarginImpactPanel
                impact={impact}
                isLoading={impactLoading}
                isError={impactError}
                employeeName={employeeName}
                showBudgetedRoleNote={showBudgetedRoleNote}
                isEmpty={!employeeId || totalComposed <= 0}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={addAllocation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || addAllocation.isPending}
            className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90"
          >
            {addAllocation.isPending ? 'Alocando...' : 'Alocar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
