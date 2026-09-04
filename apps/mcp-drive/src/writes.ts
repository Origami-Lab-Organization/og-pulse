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
  /** `auth.users.id` — é o que `project_timesheets.updated_by` referencia. */
  authId: string;
  /** `employees.id` — é o que `created_by` e as demais colunas de autoria referenciam. */
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

  return {
    authId,
    employeeId: data.id as string,
    tenantId: data.tenant_id as string,
    nome: data.nome as string,
  };
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


// ─── Horas de projeto ─────────────────────────────────────────────────────────
//
// Aqui a RLS não é só a barreira de permissão: ela carrega TODA a regra que a tela
// aplicava, e por isso lançar hora pelo chat é fiel sem reimplementar nada.
//
//   - `Employees can insert own timesheets` exige que a linha aponte para uma alocação
//     DA PRÓPRIA PESSOA (`project_members` → `employees`), então não há como lançar hora
//     em projeto onde ela não está alocada;
//   - `Employees can update own timesheets` recusa linha travada, então período fechado
//     não é editável nem por engano;
//   - lançar para OUTRA pessoa exige `timesheet-terceiro:editar`, a mesma capacidade que
//     governa a tela de Meu Time;
//   - o custo por hora é gravado por trigger (`set_project_timesheet_cost_snapshot`) —
//     este código não toca nisso, e não deve: custo vindo do modelo seria valor inventado.
//
// A chave única é (project_member_id, work_date): lançar de novo no mesmo dia CORRIGE o
// lançamento, em vez de duplicar.

export interface LancamentoDeHoras {
  hours: number;
  work_date: string;
  description?: string;
  project_id?: string;
  project_query?: string;
  person_query?: string;
}

async function resolveProjeto(supabase: Awaited<ReturnType<typeof getSupabase>>, input: LancamentoDeHoras) {
  if (input.project_id) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', input.project_id)
      .maybeSingle();
    if (error) throw new Error(erroDeRls(error.message));
    if (!data) throw new Error('Projeto não encontrado, ou fora do que seu perfil alcança.');
    return data as { id: string; name: string };
  }

  const termo = (input.project_query ?? '').trim();
  if (!termo) throw new Error('Informe o projeto, por id ou por parte do nome.');

  const { data, error } = await supabase.from('projects').select('id, name').ilike('name', `%${termo}%`).limit(6);
  if (error) throw new Error(erroDeRls(error.message));
  const achados = (data ?? []) as { id: string; name: string }[];
  if (achados.length === 0) throw new Error(`Nenhum projeto seu com "${termo}" no nome.`);
  if (achados.length > 1) {
    // Escolher por conta própria arriscaria lançar hora no projeto errado, que é erro
    // de faturamento — melhor devolver a lista e deixar a pessoa dizer qual.
    throw new Error(
      `Mais de um projeto casa com "${termo}": ${achados.map((p) => p.name).join(', ')}. Diga qual, ou passe o id.`,
    );
  }
  return achados[0];
}

/**
 * A alocação da pessoa no projeto. É ela que a policy exige, e é o que dá a resposta
 * acionável quando não existe — "você não está alocado" é diagnóstico, "permissão negada"
 * não é.
 */
async function resolveAlocacao(
  supabase: Awaited<ReturnType<typeof getSupabase>>,
  projeto: { id: string; name: string },
  pessoaQuery: string | undefined,
  eu: Sessao,
) {
  let employeeId = eu.employeeId;
  let quem = 'você';

  if (pessoaQuery?.trim()) {
    const { data, error } = await supabase
      .from('employees')
      .select('id, nome')
      .ilike('nome', `%${pessoaQuery.trim()}%`)
      .limit(6);
    if (error) throw new Error(erroDeRls(error.message));
    const pessoas = (data ?? []) as { id: string; nome: string }[];
    if (pessoas.length === 0) throw new Error(`Ninguém com "${pessoaQuery}" no nome, dentro do que você alcança.`);
    if (pessoas.length > 1) {
      throw new Error(`Mais de uma pessoa casa com "${pessoaQuery}": ${pessoas.map((p) => p.nome).join(', ')}.`);
    }
    employeeId = pessoas[0].id;
    quem = pessoas[0].nome;
  }

  const { data, error } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projeto.id)
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (error) throw new Error(erroDeRls(error.message));
  if (!data) {
    throw new Error(
      `${quem === 'você' ? 'Você não está' : `${quem} não está`} alocado em ${projeto.name}. Hora só entra em projeto com alocação — quem gerencia o projeto inclui na equipe.`,
    );
  }
  return { memberId: data.id as string, quem };
}

export async function lancaHorasDeProjeto(input: LancamentoDeHoras): Promise<string> {
  if (!(input.hours >= 0)) throw new Error('Horas precisa ser um número maior ou igual a zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.work_date)) {
    throw new Error('Data precisa estar no formato AAAA-MM-DD.');
  }

  const supabase = await getSupabase();
  const eu = await sessao();
  const projeto = await resolveProjeto(supabase, input);
  const { memberId, quem } = await resolveAlocacao(supabase, projeto, input.person_query, eu);

  const { error } = await supabase.from('project_timesheets').upsert(
    {
      project_id: projeto.id,
      project_member_id: memberId,
      work_date: input.work_date,
      hours: input.hours,
      description: input.description ?? null,
      // As duas colunas de autoria apontam para tabelas DIFERENTES no schema:
      // `created_by` referencia `employees(id)` e `updated_by` referencia `auth.users(id)`.
      // Passar o mesmo id nas duas estoura a foreign key — foi o que aconteceu no primeiro
      // teste. Registrado como inconsistência de schema em TD-0023.
      created_by: eu.employeeId,
      updated_by: eu.authId,
    },
    { onConflict: 'project_member_id,work_date' },
  );

  if (error) {
    const m = error.message;
    if (/row-level security|permission denied/i.test(m)) {
      throw new Error(
        quem === 'você'
          ? 'O Pulse recusou. Se o período já foi submetido, o lançamento está travado e a correção passa por quem aprova.'
          : `O Pulse recusou lançar hora para ${quem}: seu perfil não permite editar apontamento de terceiro, ou o período está travado.`,
      );
    }
    throw new Error(m);
  }

  return (
    `Hora lançada: ${input.hours}h em ${projeto.name}\n` +
    `  data: ${input.work_date} · pessoa: ${quem === 'você' ? eu.nome : quem}` +
    (input.description ? `\n  descrição: ${input.description}` : '') +
    `\n  lançar de novo nesta data corrige o valor, não duplica.`
  );
}

export async function listaHorasLancadas(de: string, ate: string, pessoaQuery?: string): Promise<string> {
  const supabase = await getSupabase();

  const request = supabase
    .from('project_timesheets')
    .select('work_date, hours, description, is_locked, projects(name), project_members(employees(nome))')
    .gte('work_date', de)
    .lte('work_date', ate)
    .order('work_date');

  const { data, error } = await request.limit(200);
  if (error) throw new Error(erroDeRls(error.message));

  type Linha = {
    work_date: string;
    hours: number | null;
    description: string | null;
    is_locked: boolean | null;
    projects?: { name?: string } | null;
    project_members?: { employees?: { nome?: string } | null } | null;
  };

  let linhas = (data ?? []) as unknown as Linha[];
  if (pessoaQuery?.trim()) {
    const termo = pessoaQuery.trim().toLowerCase();
    linhas = linhas.filter((l) => (l.project_members?.employees?.nome ?? '').toLowerCase().includes(termo));
  }

  if (linhas.length === 0) return `Nenhuma hora lançada entre ${de} e ${ate}, dentro do que seu perfil alcança.`;

  const total = linhas.reduce((soma, l) => soma + Number(l.hours ?? 0), 0);
  const corpo = linhas
    .map(
      (l) =>
        `• ${l.work_date} — ${Number(l.hours ?? 0)}h em ${l.projects?.name ?? 'projeto sem nome'}` +
        ` · ${l.project_members?.employees?.nome ?? 'pessoa não identificada'}` +
        (l.is_locked ? ' · travado' : '') +
        (l.description ? `\n  ${l.description}` : ''),
    )
    .join('\n');

  return `${linhas.length} lançamento(s), ${total}h no total, entre ${de} e ${ate}:\n${corpo}`;
}
