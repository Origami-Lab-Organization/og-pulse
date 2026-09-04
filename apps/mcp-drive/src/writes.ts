/**
 * Escritas do Pulse pelo chat.
 *
 * REGRA QUE GOVERNA ESTE ARQUIVO: a barreira é a policy, não este código. Toda escrita aqui
 * roda com a sessão da pessoa, então o banco recusa o que o perfil dela não permite — no
 * caso de oportunidade, `pipeline:editar`, a mesma capacidade que governa a tela (ADR-0027).
 * Este arquivo não checa permissão, e não deve: checagem duplicada é checagem que divergem.
 *
 * O QUE NÃO ENTRA AQUI, E POR QUÊ: operação com efeito colateral fora da própria linha fica
 * na tela até existir UMA implementação que os dois lados chamem.
 *
 *   - **fechar negócio** (`closed`) orquestra 282 linhas em `useCloseBusinessDeal`: ativa o
 *     orçamento, cria o projeto, calcula o valor total. Reimplementar aqui seria manter duas
 *     versões da mesma regra, e a que divergisse criaria projeto errado.
 *   - **dar perda** (`closed_lost`) arquiva a oportunidade e marca como `skipped` os
 *     follow-ups pendentes, senão o lembrete agendado segue cobrando retorno de negócio
 *     perdido.
 *
 * Nos dois casos a ferramenta recusa e diz onde fazer, em vez de gravar meia operação.
 */
import { getSupabase } from './supabase.js';

/** Etapas que esta camada move: o funil sem os desfechos, mais o Follow Up. */
export const ETAPAS_MOVIVEIS = [
  'screening',
  'qualification',
  'proposal',
  'negotiation',
  'stand_by',
] as const;

export type EtapaMovivel = (typeof ETAPAS_MOVIVEIS)[number];

const ROTULO: Record<string, string> = {
  screening: 'Prospecção/Oportunidade',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  stand_by: 'Follow Up',
  closed: 'Ganho',
  closed_lost: 'Perda',
};

export interface Sessao {
  employeeId: string;
  tenantId: string;
  nome: string;
}

/**
 * Quem está operando, derivado da sessão — nunca de parâmetro.
 *
 * `tenant_id` e autoria vindos do modelo foram exatamente o defeito do TD-0015: o modelo
 * podia apontar outro tenant ou atribuir a mudança a outra pessoa.
 */
export async function sessao(): Promise<Sessao> {
  const supabase = await getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const authId = auth?.user?.id;
  if (!authId) throw new Error('Sessão do Pulse não encontrada. Confira PULSE_EMAIL e PULSE_PASSWORD.');

  const { data, error } = await supabase
    .from('employees')
    .select('id, tenant_id, nome')
    .eq('auth_id', authId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Sua conta não está vinculada a um funcionário ativo no Pulse.');

  return { employeeId: data.id as string, tenantId: data.tenant_id as string, nome: data.nome as string };
}

/** Campos de oportunidade que o chat escreve. Etapa fica fora: move-se por ferramenta própria. */
export interface CamposOportunidade {
  name?: string;
  company_name?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  estimated_value?: number | null;
  service_line?: string | null;
  source?: string | null;
  notes?: string | null;
}

function limpa(campos: CamposOportunidade): Record<string, unknown> {
  return Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined));
}

function erroDeRls(mensagem: string): string {
  // A RLS devolve jargão ("new row violates row-level security policy"), que não diz nada a
  // quem está conversando. Traduzir aqui é o equivalente do `humanizeError` da tela.
  if (/row-level security|permission denied/i.test(mensagem)) {
    return 'O Pulse recusou: seu perfil não permite editar o Pipeline. Quem administra concede a capacidade "pipeline:editar" em Configurações → Perfis de Acesso.';
  }
  return mensagem;
}

export async function criaOportunidade(
  campos: CamposOportunidade & { name: string },
): Promise<string> {
  const supabase = await getSupabase();
  const { employeeId, tenantId } = await sessao();

  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...limpa(campos),
      tenant_id: tenantId,
      created_by: employeeId,
      // Nasce em Prospecção, como na tela: quem cria não escolhe etapa, avança depois.
      crm_stage: 'screening',
    })
    .select('id, name, crm_stage')
    .single();

  if (error) throw new Error(erroDeRls(error.message));

  return (
    `Oportunidade criada: ${data.name}\n` +
    `  etapa: ${ROTULO[data.crm_stage as string] ?? data.crm_stage}\n` +
    `  id: ${data.id}`
  );
}

export async function atualizaOportunidade(id: string, campos: CamposOportunidade): Promise<string> {
  const mudancas = limpa(campos);
  if (Object.keys(mudancas).length === 0) return 'Nada para alterar: nenhum campo foi informado.';

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('leads')
    .update(mudancas)
    .eq('id', id)
    .select('id, name')
    .maybeSingle();

  if (error) throw new Error(erroDeRls(error.message));
  if (!data) {
    // Sem linha devolvida a causa é uma das duas, e a diferença importa para quem lê.
    throw new Error(
      'Não encontrei essa oportunidade, ou seu perfil não a alcança. Confira o id, e se ela aparece para você no Pipeline.',
    );
  }

  return `Oportunidade atualizada: ${data.name}\n  campos: ${Object.keys(mudancas).join(', ')}`;
}

export async function moveEtapaOportunidade(id: string, etapa: string): Promise<string> {
  if (etapa === 'closed') {
    throw new Error(
      'Fechar negócio não se faz pelo chat: ativa o orçamento, cria o projeto e calcula o valor total. Faça no Pipeline, arrastando para Ganho — o Pulse abre o formulário com o que falta decidir.',
    );
  }
  if (etapa === 'closed_lost') {
    throw new Error(
      'Dar perda não se faz pelo chat: arquiva a oportunidade e cancela os follow-ups pendentes, e exige o motivo registrado. Faça no Pipeline, na própria oportunidade.',
    );
  }
  if (!(ETAPAS_MOVIVEIS as readonly string[]).includes(etapa)) {
    throw new Error(`Etapa desconhecida: ${etapa}. Válidas: ${ETAPAS_MOVIVEIS.join(', ')}.`);
  }

  const supabase = await getSupabase();

  const { data: atual, error: erroLeitura } = await supabase
    .from('leads')
    .select('id, name, crm_stage, stand_by_return_stage')
    .eq('id', id)
    .maybeSingle();

  if (erroLeitura) throw new Error(erroDeRls(erroLeitura.message));
  if (!atual) {
    throw new Error(
      'Não encontrei essa oportunidade, ou seu perfil não a alcança. Confira o id, e se ela aparece para você no Pipeline.',
    );
  }

  const de = atual.crm_stage as string | null;
  if (de === etapa) return `A oportunidade ${atual.name} já está em ${ROTULO[etapa] ?? etapa}.`;

  // Follow Up guarda a etapa de origem para o retorno saber para onde voltar; sair dele
  // limpa os dois campos. É o mesmo que `moveLeadToStandBy` e `resumeLeadFromStandBy` fazem.
  const mudancas: Record<string, unknown> =
    etapa === 'stand_by'
      ? { crm_stage: 'stand_by', stand_by_return_stage: de, stand_by_since: new Date().toISOString() }
      : { crm_stage: etapa, stand_by_return_stage: null, stand_by_since: null };

  const { error } = await supabase.from('leads').update(mudancas).eq('id', id);
  if (error) throw new Error(erroDeRls(error.message));

  return (
    `Oportunidade movida: ${atual.name}\n` +
    `  de ${ROTULO[de ?? ''] ?? de ?? 'sem etapa'} para ${ROTULO[etapa] ?? etapa}` +
    (etapa === 'stand_by' ? `\n  ao retornar, volta para ${ROTULO[de ?? ''] ?? de ?? 'Prospecção'}` : '')
  );
}
