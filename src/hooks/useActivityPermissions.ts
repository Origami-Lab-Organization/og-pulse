import { useAuth } from '@/contexts/AuthContext';
import { ProjectWithRelations } from '@/types/project';

const PM_ROLES = ['pm', 'gerente', 'project manager'];

export function useActivityPermissions(project: ProjectWithRelations) {
  const { employee } = useAuth();

  const isAdmin = employee?.isAdmin ?? false;

  // Project manager: the canonical PM defined on the project record.
  const isProjectManager = project.manager_id === employee?.id;

  // PM check: project manager OR a project member with a PM-level role.
  const isPM =
    isProjectManager ||
    (project.members?.some(
      (m) =>
        m.employee_id === employee?.id &&
        PM_ROLES.includes(m.role?.toLowerCase() ?? '')
    ) ?? false);

  const isMember = project.members?.some((m) => m.employee_id === employee?.id) ?? false;

  // isEmployee: member with no elevated role on this project
  const isEmployee = isMember && !isAdmin && !isPM;

  const canCreateCard      = isAdmin || isPM || isMember;
  const canAccessSettings  = isAdmin || isPM;
  const canMoveToProductBacklog = isAdmin || isPM || isMember;
  const canMoveFromDone         = isAdmin || isPM || isMember;

  return {
    isAdmin,
    isPM,
    isMember,
    isEmployee,
    canCreateCard,
    canAccessSettings,
    canMoveToProductBacklog,
    canMoveFromDone,
  };
}
