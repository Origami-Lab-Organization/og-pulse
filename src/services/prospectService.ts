import { tabela } from '@/services/prospectingTables';
import { createLead } from '@/services/leadService';
import { getChannelLabel } from '@/lib/interactionChannels';
import type { ProspectAttachment } from '@/lib/prospectAttachments';
import { discardUpdate, reopenUpdate } from '@/lib/prospecting/transitions';
import {
  getLeverLabel,
  PROSPECT_FUNNEL_STAGES,
  toISODate,
  type ProspectActivityWithOwner,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

/**
 * Sem embed de `employees`: a policy de co-membro foi removida em PUL-162, então o embed
 * volta vazio para quem não é admin/gerente e o nome do responsável sumiria em silêncio.
 * A identidade vem do diretório (`useEmployeeDirectory`), como no resto do app.
 */
const PROSPECT_SELECT = `*, company:prospect_companies!prospects_company_id_fkey(*)`;

export interface CreateProspectInput {
  tenant_id: string;
  company_id: string;
  contact_name: string;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  primary_channel: string;
  owner_id?: string | null;
  lever?: string | null;
  created_by?: string | null;
}

export type UpdateProspectInput = Partial<Omit<CreateProspectInput, 'tenant_id' | 'created_by'>>;

export async function fetchProspects(tenantId: string): Promise<ProspectWithCompany[]> {
  const { data, error } = await tabela('prospects')
    .select(PROSPECT_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as ProspectWithCompany[];
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
 * Movimento manual de etapa.
 *
 * `em_cadencia`, `respondeu` e `sem_resposta` NÃO passam por aqui: quem decide as três é
 * o registro de atividade, no banco. Deixar a tela escrevê-las criaria um segundo dono da
 * mesma regra — o caminho pelo qual as duas versões divergem em silêncio.
 */
export async function updateProspectStage(id: string, stage: ProspectStage): Promise<void> {
  const { error } = await tabela('prospects').update({ stage }).eq('id', id);
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

export async function fetchActivitiesForMetrics(
  tenantId: string,
  since: string,
): Promise<ProspectActivityWithOwner[]> {
  const { data, error } = await tabela('prospect_activities')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('activity_date', since)
    .order('activity_date');
  if (error) throw error;
  return (data || []) as unknown as ProspectActivityWithOwner[];
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
// A passagem para o comercial
// --------------------------------------------------------------------------

export interface ConvertProspectInput {
  prospect: ProspectWithCompany;
  tenantId: string;
  createdBy?: string;
  responsibleId?: string | null;
  activitiesUntilResponse?: number | null;
}

/**
 * Converte o contato qualificado em Oportunidade.
 *
 * Leva a data do 1º toque de propósito: sem ela o comercial mede o ciclo a partir da
 * reunião e o número fica bonito e falso.
 *
 * São duas escritas sem transação, como `closeLeadAsLost`. Se a segunda falhar, sobra uma
 * oportunidade criada com o card frio ainda aberto — por isso a oportunidade vem primeiro
 * e o chamador reconhece `converted_lead_id` já preenchido em vez de criar outra.
 */
export async function convertProspectToLead(input: ConvertProspectInput): Promise<{ leadId: string }> {
  const { prospect, tenantId, createdBy, responsibleId, activitiesUntilResponse } = input;
  const empresa = prospect.company?.name ?? prospect.contact_name;

  const lead = await createLead({
    tenant_id: tenantId,
    name: empresa,
    company_name: empresa,
    client_id: prospect.company?.client_id ?? undefined,
    contact_name: prospect.contact_name,
    contact_email: prospect.contact_email ?? undefined,
    contact_phone: prospect.contact_phone ?? undefined,
    source: 'abordagem_direta',
    created_by: createdBy,
    responsible_id: responsibleId ?? prospect.owner_id ?? undefined,
    prospect_id: prospect.id,
    first_touch_at: prospect.first_touch_at ?? undefined,
    notes: montarNotaDeOrigem(prospect, activitiesUntilResponse),
  });

  await tabela('prospects')
    .update({
      stage: 'convertido',
      converted_lead_id: (lead as { id: string }).id,
      closed_at: new Date().toISOString(),
      next_activity_on: null,
    })
    .eq('id', prospect.id);

  return { leadId: (lead as { id: string }).id };
}

function montarNotaDeOrigem(
  prospect: ProspectWithCompany,
  activitiesUntilResponse?: number | null,
): string {
  const linhas = ['Origem: prospecção.'];
  if (prospect.lever) linhas.push(`Alavanca: ${getLeverLabel(prospect.lever)}.`);
  if (prospect.first_touch_at) linhas.push(`1º toque em ${formatarData(prospect.first_touch_at)}.`);
  if (activitiesUntilResponse) linhas.push(`Atividades até responder: ${activitiesUntilResponse}.`);
  linhas.push(`Canal principal: ${getChannelLabel(prospect.primary_channel)}.`);
  const empresa = prospect.company;
  if (empresa?.ring || empresa?.tier) {
    linhas.push(`Anel/Tier: ${empresa.ring ?? '—'} / ${empresa.tier ?? '—'}.`);
  }
  return linhas.join(' ');
}

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}
