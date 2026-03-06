import { useMemo, useEffect } from 'react';
import { ProjectWithRelations } from '@/types/project';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions, useGenerateCommissions } from '@/hooks/useProjectCommissions';
import { ProjectCommissionsSection } from './ProjectCommissionsSection';

interface ProjectCommissionsTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
}

export function ProjectCommissionsTab({ project, isReadOnly = false }: ProjectCommissionsTabProps) {
  const { data: budget } = useBudget(project.budget_id);
  const { data: commissions = [] } = useProjectCommissions(project.id);
  const generateCommissionsMut = useGenerateCommissions();

  const totalCommissionValue = useMemo(() => {
    if (!budget || !budget.commission_percent) return 0;
    return (budget.commission_percent / 100) * budget.total_with_fees;
  }, [budget]);

  // Auto-generate commissions when budget has commission_percent > 0
  useEffect(() => {
    if (
      totalCommissionValue > 0 &&
      commissions.length === 0 &&
      project.installments &&
      project.installments.length > 0 &&
      !generateCommissionsMut.isPending
    ) {
      generateCommissionsMut.mutate({
        projectId: project.id,
        installments: project.installments.map((i) => ({ id: i.id })),
        totalCommission: totalCommissionValue,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCommissionValue, commissions.length, project.installments?.length, project.id]);

  return (
    <div className="space-y-6">
      <ProjectCommissionsSection
        projectId={project.id}
        commissions={commissions}
        installments={project.installments || []}
        budget={budget ? { commission_percent: budget.commission_percent, total_with_fees: budget.total_with_fees } : null}
        isEditable={!isReadOnly}
      />
    </div>
  );
}
