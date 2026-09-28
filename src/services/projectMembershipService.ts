import { supabase } from '@/integrations/supabase/client';

/**
 * Vínculo pessoa↔projeto para as telas do colaborador.
 *
 * A alocação grava em `project_role_allocations` (ADR-0006); `project_members` é o modelo
 * antigo, e várias telas ainda perguntam a ele "esta pessoa é do projeto?". Quem foi alocado
 * só pelo modelo novo não tem linha lá e some da própria tela — em "Meus Projetos" isso
 * aparecia como "Projeto não encontrado" para quem estava, sim, alocado.
 *
 * A RPC `ensure_project_membership` (§5.3) é a ponte já existente: SECURITY DEFINER,
 * idempotente, e só materializa quando existe alocação real para o par projeto/pessoa —
 * sem alocação ela levanta exceção, que aqui vira "não é do projeto".
 */
export async function garantirVinculoPorAlocacao(
  projectId: string,
  employeeId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc('ensure_project_membership', {
    p_project_id: projectId,
    p_employee_id: employeeId,
  });
  if (error || !data) return null;
  return data;
}

/** Projetos não concluídos em que a pessoa tem alocação, com ou sem linha em project_members. */
export async function projetosComAlocacao(employeeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('project_role_allocations')
    .select('project_id, projects!inner(portfolio_stage)')
    .eq('employee_id', employeeId)
    .neq('projects.portfolio_stage', 'completed');

  if (error || !data) return [];
  return [...new Set(data.map((row) => row.project_id))];
}
