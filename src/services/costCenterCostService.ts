import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Holiday } from '@/lib/workingDays';

/**
 * Busca crua para o custo por centro de custo (`useCostByCostCenter`, PUL-215).
 *
 * Vive fora do hook, e as consultas passam por `db`: o cliente do Supabase é gerado sobre
 * 118 tabelas e nove `select` no mesmo escopo estouram o limite de inferência do TypeScript
 * (TS2589) — a de `projects` sozinha já basta. `db` é o MESMO cliente, só sem o genérico do
 * schema, e cada consulta declara o tipo da linha que devolve.
 *
 * O custo consciente: neste arquivo o compilador não confere os nomes de coluna do `select`.
 * As interfaces abaixo são o contrato — mudar o `select` exige mudar o tipo ao lado. Por
 * isso a exceção fica restrita a esta leitura agregada, e não vaza para o resto do app.
 */

const db = supabase as unknown as SupabaseClient;

interface RawResult {
  data: unknown;
  error: { message: string } | null;
}

/**
 * Converte a resposta em linhas e ESTOURA se a consulta falhou.
 *
 * Cair para lista vazia em silêncio é armadilha: uma consulta quebrada seguia para a
 * agregação e a tela mostrava um número plausível com tudo caindo em "não identificado" —
 * foi exatamente o que aconteceu com o filtro por `tenant_id` em `project_members`, coluna
 * que não existe. Melhor a tela dizer que não conseguiu ler do que mentir com aparência de
 * certeza.
 */
function rowsOf<T>(label: string) {
  return (result: RawResult): T[] => {
    // harness-ok: front React sem HttpException; o erro sobe para o TanStack Query.
    if (result.error) throw new Error(`Não foi possível ler ${label}: ${result.error.message}`);
    return (result.data ?? []) as T[];
  };
}

export interface CostCenterRow {
  id: string;
  name: string;
  is_active: boolean;
}

export interface EmployeeCostRow {
  id: string;
  nome: string | null;
  total_monthly_cost_estimated: number | null;
  jornada_diaria: number | null;
  data_admissao: string | null;
}

export interface ServiceCenterRow {
  id: string;
  cost_center_id: string | null;
}

export interface ProjectServiceRow {
  id: string;
  name: string;
  /** Guarda `service_id` como texto; o nome da coluna mente (ADR-0031). */
  service_line: string | null;
}

export interface ProjectMemberRow {
  id: string;
  /** Anulável: um membro pode ser um papel do orçamento ainda sem pessoa vinculada. */
  employee_id: string | null;
}

export interface ActivityTypeNameRow {
  id: string;
  name: string;
}

export interface ActivityHourRow {
  cost_center_id: string | null;
  activity_type_id: string;
  employee_id: string;
  hours: number | null;
  work_date: string;
}

export interface ProjectHourRow {
  project_id: string;
  project_member_id: string | null;
  hours: number | null;
  cost_per_hour: number | null;
  work_date: string;
}

export interface CostInputs {
  centers: CostCenterRow[];
  employees: EmployeeCostRow[];
  holidays: Holiday[];
  services: ServiceCenterRow[];
  projects: ProjectServiceRow[];
  members: ProjectMemberRow[];
  activities: ActivityTypeNameRow[];
  activityHours: ActivityHourRow[];
  projectHours: ProjectHourRow[];
}

/**
 * As consultas disparam na criação (chamar `.then` executa o builder) e são aguardadas
 * depois: paralelismo sem `Promise.all`.
 */
export async function fetchCostInputs(tenantId: string, startDate: string, endDate: string): Promise<CostInputs> {
  const centersP = db
    .from('cost_centers')
    .select('id, name, is_active')
    .eq('tenant_id', tenantId)
    .then(rowsOf<CostCenterRow>('os centros de custo'));
  const employeesP = db
    .from('employees')
    .select('id, nome, total_monthly_cost_estimated, jornada_diaria, data_admissao')
    .eq('tenant_id', tenantId)
    .then(rowsOf<EmployeeCostRow>('o custo das pessoas'));
  const holidaysP = db
    .from('company_holidays')
    .select('holiday_type, fixed_day, fixed_month, specific_date')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .then(rowsOf<Holiday>('os feriados da empresa'));
  const servicesP = db
    .from('services')
    .select('id, cost_center_id')
    .eq('tenant_id', tenantId)
    .then(rowsOf<ServiceCenterRow>('os serviços'));
  const projectsP = db
    .from('projects')
    .select('id, name, service_line')
    .eq('tenant_id', tenantId)
    .then(rowsOf<ProjectServiceRow>('os projetos'));
  // Sem `tenant_id`: `project_members` se isola pelo projeto (e pela RLS), como
  // `project_timesheets`. Só os membros citados pelas horas dos projetos deste tenant são
  // usados na agregação.
  const membersP = db
    .from('project_members')
    .select('id, employee_id')
    .then(rowsOf<ProjectMemberRow>('os membros dos projetos'));
  const activitiesP = db
    .from('activity_types')
    .select('id, name')
    .eq('tenant_id', tenantId)
    .then(rowsOf<ActivityTypeNameRow>('as atividades internas'));
  const activityHoursP = db
    .from('activity_timesheets')
    .select('cost_center_id, activity_type_id, employee_id, hours, work_date')
    .eq('tenant_id', tenantId)
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .then(rowsOf<ActivityHourRow>('as horas de atividade interna'));
  const projectHoursP = db
    .from('project_timesheets')
    .select('project_id, project_member_id, hours, cost_per_hour, work_date')
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .then(rowsOf<ProjectHourRow>('as horas de projeto'));

  return {
    centers: await centersP,
    employees: await employeesP,
    holidays: await holidaysP,
    services: await servicesP,
    projects: await projectsP,
    members: await membersP,
    activities: await activitiesP,
    activityHours: await activityHoursP,
    projectHours: await projectHoursP,
  };
}
