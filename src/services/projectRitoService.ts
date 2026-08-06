// Remover quando `integrations/supabase/types.ts` for regenerado com as
// tabelas de rito (mesmo tratamento de férias e orçamentos).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';
import { PORTFOLIO_STAGE } from '@/types/portfolio';
import type {
  CreateProjectRitoInput,
  ProjectRitoLink,
  ProjectRitoType,
  RitoProjectOption,
} from '@/types/projectRito';

/**
 * Vínculos de rito.
 *
 * O cast no nome da tabela existe porque `project_ritos` só entra em
 * `integrations/supabase/types.ts` quando a migration for aplicada e os tipos
 * regenerados — mesmo padrão já usado em `vacation_requests` e `budgets`.
 *
 * A autorização é da RLS (`can_link_project_rito`): gerente do projeto ou
 * membro alocado. Nada aqui substitui isso.
 */

interface RitoRow {
  id: string;
  project_id: string;
  rito_type: ProjectRitoType;
  event_title: string;
  projects: { name: string } | null;
  employees: { nome: string } | null;
}

function toLink(row: RitoRow): ProjectRitoLink {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? 'Projeto',
    ritoType: row.rito_type,
    eventTitle: row.event_title,
    linkedByName: row.employees?.nome ?? null,
  };
}

export const projectRitoService = {
  /**
   * Vínculos desta reunião. Pode haver mais de um: a mesma reunião pode ser
   * rito de dois projetos, e quem vinculou pode ter sido outra pessoa.
   */
  async listByIcalUid(tenantId: string, icalUid: string): Promise<ProjectRitoLink[]> {
    if (!icalUid) return [];

    const { data, error } = await supabase.from('project_ritos' as any)
      .select('id, project_id, rito_type, event_title, projects(name), employees(nome)')
      .eq('tenant_id', tenantId)
      .eq('ical_uid', icalUid);

    if (error) throw error;
    return ((data ?? []) as RitoRow[]).map(toLink);
  },

  async create(
    tenantId: string,
    employeeId: string,
    input: CreateProjectRitoInput,
  ): Promise<void> {
    const { error } = await supabase.from('project_ritos' as any).insert({
      tenant_id: tenantId,
      project_id: input.projectId,
      rito_type: input.ritoType,
      ical_uid: input.icalUid,
      event_title: input.eventTitle,
      is_series: input.isSeries,
      linked_by: employeeId,
    });

    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('project_ritos' as any).delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Projetos onde a pessoa pode vincular rito: os que ela é membro e os que
   * gerencia. Projetos concluídos ficam fora.
   */
  async listEligibleProjects(
    tenantId: string,
    employeeId: string,
  ): Promise<RitoProjectOption[]> {
    const [memberships, managed] = await Promise.all([
      supabase
        .from('project_members')
        .select('projects!inner(id, name, portfolio_stage)')
        .eq('employee_id', employeeId),
      supabase
        .from('projects')
        .select('id, name, portfolio_stage')
        .eq('tenant_id', tenantId)
        .eq('manager_id', employeeId),
    ]);

    if (memberships.error) throw memberships.error;
    if (managed.error) throw managed.error;

    const fromMemberships = (memberships.data ?? [])
      .map((row) => (row as { projects: RitoProjectOption & { portfolio_stage: string } }).projects)
      .filter(Boolean);

    const byId = new Map<string, RitoProjectOption>();
    [...fromMemberships, ...(managed.data ?? [])]
      .filter((project) => (project as { portfolio_stage?: string }).portfolio_stage !== PORTFOLIO_STAGE.COMPLETED)
      .forEach((project) => byId.set(project.id, { id: project.id, name: project.name }));

    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  },
};
