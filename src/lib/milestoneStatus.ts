import { isPointType, MilestoneStatus, MilestoneType } from '@/types/projectMilestone';

// Parse YYYY-MM-DD como data local, evitando shift de timezone (mesma
// convenção usada em ProjectScheduleTab.tsx / AllocationOverview.tsx).
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Status "efetivo" para exibição: marca automaticamente como atrasado quando
 * a data de referência já passou e o item não está concluído. Puramente
 * derivado no client — nunca escreve no banco, pois consultores (read-only)
 * não têm permissão de UPDATE em project_milestones (RLS via can_manage_project).
 */
export function getEffectiveMilestoneStatus(
  item: { status: MilestoneStatus; start_date: string; end_date: string; milestone_type: MilestoneType },
  today: Date,
): MilestoneStatus {
  if (item.status === 'completed') return 'completed';

  const referenceDate = isPointType(item.milestone_type)
    ? parseLocalDate(item.start_date)
    : parseLocalDate(item.end_date);

  return referenceDate < today ? 'delayed' : item.status;
}
