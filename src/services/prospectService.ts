import { rpc, tabela } from '@/services/prospectingTables';
import { todasAsPaginas } from '@/lib/paginacao';
import type { ProspectAttachment } from '@/lib/prospectAttachments';
import { discardUpdate, reopenUpdate } from '@/lib/prospecting/transitions';
import {
  toISODate,
  type PendingTaskLite,
  type ProspectActivityWithOwner,
  type ProspectStage,
  type ProspectTaskDB,
  type ProspectWithCompany,
} from '@/types/prospect';
import type { ActivityLite, ProspectStageChangeDB } from '@/types/prospectMetrics';

/**
 * Sem embed de `employees`: a policy de co-membro foi removida em PUL-162, então o embed
 * volta vazio para quem não é admin/gerente e o nome do responsável sumiria em silêncio.
 * A identidade vem do diretório (`useEmployeeDirectory`), como no resto do app.
 */
const PROSPECT_SELECT = `*, company:prospect_companies!prospects_company_id_fkey(*)`;

export interface CreateProspectInput {
  tenant_id: string;
  company_id: string;
  /**
   * A pessoa do card (ADR-0045). Com ela, os campos de contato abaixo são ignorados: o banco
   * copia os dados da pessoa. Sem ela, o banco acha a pessoa pelo e-mail ou LinkedIn, ou a cria
   * a partir desses campos — é o caminho do "Virar contato".
   */
  contact_id?: string;
  contact_name?: string;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  primary_channel: string;
  owner_id?: string | null;
  lever?: string | null;
  /** Valor estimado antes do orçamento (29/09/2026). */
  estimated_value?: number | null;
  notes?: string | null;
  created_by?: string | null;
}

/**
 * Campos do NEGÓCIO. Os da pessoa (nome, cargo, e-mail, telefone, redes) se editam no contato
 * (`prospectContactService.update`), que vale para todos os cards dela.
 */
export type UpdateProspectInput = Partial<
  Pick<CreateProspectInput, 'company_id' | 'primary_channel' | 'owner_id' | 'lever' | 'estimated_value' | 'notes'>
>;

/** Página a página: o PostgREST corta em 1000 linhas sem erro, e o quadro perderia cards. */
export async function fetchProspects(tenantId: string): Promise<ProspectWithCompany[]> {
  return todasAsPaginas<ProspectWithCompany>((de, ate) =>
    tabela('prospects')
      .select(PROSPECT_SELECT)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .order('id')
      .range(de, ate),
  );
}

export async function fetchProspectById(id: string): Promise<ProspectWithCompany | null> {
  const { data, error } = await tabela('prospects')
    .select(PROSPECT_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ProspectWithCompany) ?? null;
}

export async function createProspect(input: CreateProspectInput): Promise<ProspectWithCompany> {
  const { data, error } = await tabela('prospects')
    .insert(input)
    .select(PROSPECT_SELECT)
    .single();
  if (error) throw error;
  return data as unknown as ProspectWithCompany;
}

export async function updateProspect(id: string, updates: UpdateProspectInput): Promise<void> {
  const { error } = await tabela('prospects').update(updates).eq('id', id);
  if (error) throw error;
}

/**
 * Movimento manual de etapa. Com `occurredOn`, o histórico de etapa guarda o dia do fato em
 * vez do dia do clique — a reunião que aconteceu ontem e foi registrada hoje.
 *
 * Para AVANÇAR, `em_cadencia`, `respondeu` e `sem_resposta` NÃO passam por aqui: quem
 * decide as três é o registro de atividade, no banco. Deixar a tela escrevê-las criaria um
 * segundo dono da mesma regra. Para VOLTAR (`previousStagesOf`, 01/10/2026), qualquer etapa
 * de trabalho passa: é correção, e a atividade registrada continua valendo.
 */
export async function updateProspectStage(id: string, stage: ProspectStage, occurredOn?: string): Promise<void> {
  const { error } = occurredOn
    ? await rpc('set_prospect_stage', { p_prospect_id: id, p_stage: stage, p_occurred_on: occurredOn })
    : await tabela('prospects').update({ stage }).eq('id', id);
  if (error) throw error;
}

export async function discardProspect(id: string, reason: string): Promise<void> {
  const { error } = await tabela('prospects').update(discardUpdate(reason)).eq('id', id);
  if (error) throw error;
}

export async function reopenProspect(id: string): Promise<void> {
  const { error } = await tabela('prospects').update(reopenUpdate()).eq('id', id);
  if (error) throw error;
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await tabela('prospects').delete().eq('id', id);
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Atividades
// --------------------------------------------------------------------------

export interface RegisterActivityInput {
  tenant_id: string;
  prospect_id: string;
  channel: string;
  got_response?: boolean;
  activity_date?: string;
  notes?: string | null;
  attachments?: ProspectAttachment[];
  owner_id?: string | null;
  created_by?: string | null;
}

/**
 * Registra uma atividade. É a escrita mais importante do módulo e tem que caber num clique.
 *
 * Não envia número do toque nem próxima data: quem conta e agenda é o trigger
 * `prospect_activities_advance`, no banco. Calcular aqui duplicaria a cadência.
 */
export async function registerActivity(input: RegisterActivityInput): Promise<ProspectActivityWithOwner> {
  const { data, error } = await tabela('prospect_activities')
    .insert({
      tenant_id: input.tenant_id,
      prospect_id: input.prospect_id,
      channel: input.channel,
      got_response: input.got_response ?? false,
      activity_date: input.activity_date ?? toISODate(new Date()),
      notes: input.notes ?? null,
      attachments: input.attachments ?? [],
      owner_id: input.owner_id ?? null,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ProspectActivityWithOwner;
}

export interface UpdateActivityInput {
  id: string;
  channel: string;
  notes: string | null;
  attachments: ProspectAttachment[];
}

/**
 * Edita o conteúdo de uma atividade: canal, relato e anexos.
 *
 * `got_response`, `sequence_no` e `activity_date` ficam de FORA de propósito. Os três já
 * produziram efeito quando a atividade foi criada — o trigger contou o toque, agendou a
 * próxima data e, se houve resposta, moveu a etapa. Reescrevê-los aqui mudaria a métrica
 * sem desfazer o efeito, e a linha do tempo passaria a contar uma história que o card não
 * viveu. Corrigir um desses exige apagar a atividade e registrar de novo.
 */
export async function updateActivity(input: UpdateActivityInput): Promise<void> {
  const { error } = await tabela('prospect_activities')
    .update({
      channel: input.channel,
      notes: input.notes,
      attachments: input.attachments,
    })
    .eq('id', input.id);
  if (error) throw error;
}

export async function fetchProspectActivities(prospectId: string): Promise<ProspectActivityWithOwner[]> {
  const { data, error } = await tabela('prospect_activities')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('sequence_no', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ProspectActivityWithOwner[];
}

// --------------------------------------------------------------------------
// Métricas por período
// --------------------------------------------------------------------------

const ATIVIDADE_LEVE = 'prospect_id, activity_date, sequence_no, got_response';

/** Todas as atividades com resposta: a 1ª resposta de um contato pode ser bem antiga. */
export async function fetchResponseActivities(tenantId: string): Promise<ActivityLite[]> {
  return todasAsPaginas((de, ate) =>
    tabela('prospect_activities')
      .select(ATIVIDADE_LEVE)
      .eq('tenant_id', tenantId)
      .eq('got_response', true)
      .order('id')
      .range(de, ate),
  );
}

export async function fetchActivitiesSince(tenantId: string, since: string): Promise<ActivityLite[]> {
  return todasAsPaginas((de, ate) =>
    tabela('prospect_activities')
      .select(ATIVIDADE_LEVE)
      .eq('tenant_id', tenantId)
      .gte('activity_date', since)
      .order('id')
      .range(de, ate),
  );
}

export async function fetchStageChanges(tenantId: string): Promise<ProspectStageChangeDB[]> {
  return todasAsPaginas((de, ate) =>
    tabela('prospect_stage_changes')
      .select('prospect_id, from_stage, to_stage, discard_reason, occurred_on, source')
      .eq('tenant_id', tenantId)
      .order('id')
      .range(de, ate),
  );
}

/**
 * Desfaz o último registro.
 *
 * O contador do contato NÃO volta atrás: `activity_count` só cresce, e o índice único
 * (prospect_id, sequence_no) recusaria reaproveitar o número. O desfazer serve para o
 * clique errado sumir da lista da pessoa, não para reescrever o histórico da cadência.
 */
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await tabela('prospect_activities').delete().eq('id', id);
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Tarefas
// --------------------------------------------------------------------------

export interface CreateTaskInput {
  prospect_id: string;
  description: string;
  due_date: string;
  created_by?: string | null;
}

/** Tenant e responsável vêm do contato, pelo trigger `prospect_tasks_inherit_parent`. */
export async function createTask(input: CreateTaskInput): Promise<ProspectTaskDB> {
  const { data, error } = await tabela('prospect_tasks')
    .insert({
      prospect_id: input.prospect_id,
      description: input.description,
      due_date: input.due_date,
      created_by: input.created_by ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ProspectTaskDB;
}

export interface UpdateTaskInput {
  id: string;
  description?: string;
  due_date?: string;
  done_at?: string | null;
  done_by?: string | null;
}

export async function updateTask({ id, ...updates }: UpdateTaskInput): Promise<void> {
  const { error } = await tabela('prospect_tasks').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchProspectTasks(prospectId: string): Promise<ProspectTaskDB[]> {
  const { data, error } = await tabela('prospect_tasks')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('due_date');
  if (error) throw error;
  return (data || []) as ProspectTaskDB[];
}

/** Todas as tarefas pendentes da organização: a base dos avisos de vencimento do quadro. */
export async function fetchPendingTasks(tenantId: string): Promise<PendingTaskLite[]> {
  return todasAsPaginas((de, ate) =>
    tabela('prospect_tasks')
      .select('prospect_id, due_date, description')
      .eq('tenant_id', tenantId)
      .is('done_at', null)
      .order('id')
      .range(de, ate),
  );
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await tabela('prospect_tasks').delete().eq('id', id);
  if (error) throw error;
}

// --------------------------------------------------------------------------
// Ganho
// --------------------------------------------------------------------------

/**
 * Fechamos negócio (28/09/2026). A RPC move para Ganho e data o histórico pelo dia do
 * fechamento; as regras (só de Reunião feita em diante, data obrigatória) moram no banco.
 * `value` nulo é o ganho registrado sem valor — o card sinaliza até alguém preencher.
 * Chamar de novo em quem já está em Ganho corrige data e valor.
 */
export async function markProspectWon(id: string, wonOn: string, value: number | null): Promise<void> {
  const { error } = await rpc('mark_prospect_won', { p_prospect_id: id, p_won_on: wonOn, p_value: value });
  if (error) throw error;
}
