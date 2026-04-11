import { useAuth } from '@/contexts/AuthContext';
import { ProjectWithRelations } from '@/types/project';

export function useActivityPermissions(project: ProjectWithRelations) {
  const { employee } = useAuth();

  const isAdmin  = employee?.isAdmin ?? false;
  const isPM     = (employee?.is_gerente ?? false) || isAdmin;
  const isMember = project.members?.some((m) => m.employee_id === employee?.id) ?? false;
  // isEmployee: membro do projeto sem papel de admin ou PM
  const isEmployee = isMember && !isAdmin && !isPM;
  const canMoveToProductBacklog = isAdmin || isPM;
  const canMoveFromDone         = isAdmin || isPM;

  return { isAdmin, isPM, isMember, isEmployee, canMoveToProductBacklog, canMoveFromDone };
}
