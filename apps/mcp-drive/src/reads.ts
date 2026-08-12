/**
 * Leituras do Pulse expostas ao chat.
 *
 * A RLS já limita o que a pessoa enxerga, mas ela foi desenhada para uma tela
 * que alguém olha — não para um transcript que persiste e sai da máquina. Por
 * isso cada `select` aqui é explícito: campo de custo, salário, margem, folha e
 * reembolso NÃO entram em consulta nenhuma, nem para admin. Quem precisa desse
 * número abre a tela. Ver boundaries.md e ADR-0020.
 *
 * A exceção consciente é o valor da oportunidade no pipeline: é informação
 * comercial, decidida caso a caso, e não expõe custo nem remuneração de
 * ninguém.
 */

import { getSupabase } from './supabase.js';

interface NamedRef {
  nome: string;
}

interface ClientRef {
  trading_name: string | null;
  company_name: string | null;
}

interface ProjectRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_continuous: boolean;
  status: string;
  portfolio_stage: string | null;
  service_line: string | null;
  client: ClientRef | null;
  manager: NamedRef | null;
}

interface AllocationRow {
  employee_id: string;
  planned_hours: number | null;
  employee: { nome: string; cargo: string } | null;
}

interface OpportunityRow {
  id: string;
  name: string;
  company_name: string | null;
  estimated_value: number | null;
  crm_stage: string | null;
}

interface ActivityRow {
  card_number: number | null;
  title: string;
  card_type: string;
  column_name: string;
  points: number | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  assignee: NamedRef | null;
}

interface KeyResultRow {
  description: string;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
}

interface OkrRow {
  objective: string;
  status: string;
  progress_percent: number | null;
  target_date: string | null;
  key_results: KeyResultRow[] | null;
}

const PORTFOLIO_STAGE_LABELS: Record<string, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentação de Resultados',
  learning_case: 'Aprendizado e Case',
  completed: 'Concluído',
};

const CRM_STAGE_LABELS: Record<string, string> = {
  screening: 'Prospecção',
  qualification: 'Qualificação',
  proposal: 'Proposta Enviada',
  negotiation: 'Negociação',
  closed: 'Fechado - Ganho',
  closed_lost: 'Perdido',
  stand_by: 'Stand By',
};

const ACTIVITY_COLUMN_LABELS: Record<string, string> = {
  product_backlog: 'Product Backlog',
  sprint_backlog: 'Sprint Backlog',
  in_dev: 'In Dev',
  in_test: 'In Test',
  in_deploy: 'In Deploy',
  done: 'Done',
};

function label(map: Record<string, string>, value: string | null): string {
  if (!value) return '—';
  return map[value] ?? value;
}

function clientOf(row: ProjectRow): string {
  return row.client?.trading_name ?? row.client?.company_name ?? '—';
}

export async function listProjects(query?: string, stage?: string): Promise<string> {
  const supabase = await getSupabase();

  let request = supabase
    .from('projects')
    .select(
      'id, name, start_date, end_date, is_continuous, status, portfolio_stage, service_line, ' +
        'client:clients(trading_name, company_name), manager:employees!projects_manager_id_fkey(nome)',
    )
    .order('name');

  if (query) request = request.ilike('name', `%${query}%`);
  if (stage) request = request.eq('portfolio_stage', stage);

  const { data, error } = await request.limit(50);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'Nenhum projeto encontrado.';

  return (data as unknown as ProjectRow[])
    .map((row) => {
      const period = row.is_continuous
        ? 'contínuo'
        : `${row.start_date}${row.end_date ? ` a ${row.end_date}` : ''}`;
      return (
        `• ${row.name} — ${clientOf(row)}\n` +
        `  etapa: ${label(PORTFOLIO_STAGE_LABELS, row.portfolio_stage)} · status: ${row.status}\n` +
        `  GP: ${row.manager?.nome ?? '—'} · período: ${period}\n` +
        `  id: ${row.id}`
      );
    })
    .join('\n');
}

export async function listProjectTeam(projectId: string): Promise<string> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('project_role_allocations')
    .select('employee_id, year, month, planned_hours, employee:employees(nome, cargo)')
    .eq('project_id', projectId)
    .order('year')
    .order('month');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'Ninguém alocado neste projeto.';

  const byEmployee = new Map<string, { nome: string; cargo: string; hours: number; months: number }>();

  for (const row of data as unknown as AllocationRow[]) {
    const key = row.employee_id;
    const current = byEmployee.get(key) ?? {
      nome: row.employee?.nome ?? '—',
      cargo: row.employee?.cargo ?? '—',
      hours: 0,
      months: 0,
    };
    current.hours += Number(row.planned_hours ?? 0);
    current.months += 1;
    byEmployee.set(key, current);
  }

  return [...byEmployee.values()]
    .sort((a, b) => b.hours - a.hours)
    .map(
      (person) =>
        `• ${person.nome} (${person.cargo}) — ${Math.round(person.hours)}h planejadas em ${person.months} mês(es)`,
    )
    .join('\n');
}

export async function listOpportunities(stage?: string, query?: string): Promise<string> {
  const supabase = await getSupabase();

  let request = supabase
    .from('leads')
    .select('id, name, company_name, contact_name, estimated_value, crm_stage, service_line, created_at')
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (stage) request = request.eq('crm_stage', stage);
  if (query) request = request.ilike('name', `%${query}%`);

  const { data, error } = await request.limit(50);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'Nenhuma oportunidade encontrada.';

  return (data as unknown as OpportunityRow[])
    .map((row) => {
      const value = Number(row.estimated_value ?? 0);
      const formatted = value > 0 ? `R$ ${value.toLocaleString('pt-BR')}` : 'sem valor informado';
      return (
        `• ${row.name}${row.company_name ? ` — ${row.company_name}` : ''}\n` +
        `  etapa: ${label(CRM_STAGE_LABELS, row.crm_stage)} · valor estimado: ${formatted}\n` +
        `  id: ${row.id}`
      );
    })
    .join('\n');
}

export async function listProjectActivities(projectId: string, column?: string): Promise<string> {
  const supabase = await getSupabase();

  let request = supabase
    .from('project_activity_cards')
    .select(
      'id, card_number, title, card_type, column_name, points, is_blocked, blocked_reason, ' +
        'assignee:employees!project_activity_cards_assignee_id_fkey(nome)',
    )
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('column_name')
    .order('position');

  if (column) request = request.eq('column_name', column);

  const { data, error } = await request.limit(100);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'Nenhuma atividade neste projeto.';

  return (data as unknown as ActivityRow[])
    .map(
      (row) =>
        `• #${row.card_number ?? '—'} ${row.title}\n` +
        `  ${label(ACTIVITY_COLUMN_LABELS, row.column_name)} · ${row.card_type}` +
        `${row.points ? ` · ${row.points} pts` : ''} · ${row.assignee?.nome ?? 'sem responsável'}` +
        `${row.is_blocked ? `\n  🚫 bloqueado: ${row.blocked_reason ?? 'sem motivo informado'}` : ''}`,
    )
    .join('\n');
}

export async function listProjectOkrs(projectId: string): Promise<string> {
  const supabase = await getSupabase();

  const { data, error } = await supabase
    .from('project_okrs')
    .select('id, objective, status, progress_percent, target_date, key_results:project_key_results(description, current_value, target_value, unit)')
    .eq('project_id', projectId)
    .order('created_at');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return 'Nenhum objetivo definido neste projeto.';

  return (data as unknown as OkrRow[])
    .map((row) => {
      const krs = row.key_results ?? [];
      const krLines = krs.map((kr) => {
        const progress =
          kr.target_value != null ? ` (${kr.current_value ?? 0}/${kr.target_value}${kr.unit ?? ''})` : '';
        return `    - ${kr.description}${progress}`;
      });

      return (
        `• ${row.objective}\n` +
        `  ${Math.round(row.progress_percent ?? 0)}% · ${row.status}` +
        `${row.target_date ? ` · alvo ${row.target_date}` : ''}` +
        (krLines.length > 0 ? `\n${krLines.join('\n')}` : '')
      );
    })
    .join('\n');
}
