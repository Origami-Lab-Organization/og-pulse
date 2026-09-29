/**
 * Escritas do Pulse pelo chat.
 *
 * REGRA QUE GOVERNA ESTE ARQUIVO: a barreira é a policy, não este código. Toda escrita aqui
 * roda com a sessão da pessoa, então o banco recusa o que o perfil dela não permite — a
 * mesma capacidade que governa a tela (ADR-0027). Este arquivo não checa permissão, e não
 * deve: checagem duplicada é checagem que diverge.
 *
 * O QUE NÃO ENTRA AQUI, E POR QUÊ: operação com efeito colateral fora da própria linha fica
 * na tela até existir UMA implementação que os dois lados chamem.
 *
 * A escrita de Oportunidade (Pipeline, `/pipeline`) saiu em 29/09/2026: o comercial passou
 * a viver na Prospecção de ponta a ponta, do primeiro toque ao Ganho ou Perda, e é operado
 * pelo servidor og-pulse-prospeccao.
 */
import { getSupabase } from './supabase.js';

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

function erroDeRls(mensagem: string): string {
  // A RLS devolve jargão ("new row violates row-level security policy"), que não diz nada a
  // quem está conversando. Traduzir aqui é o equivalente do `humanizeError` da tela.
  if (/row-level security|permission denied/i.test(mensagem)) {
    return 'O Pulse recusou: seu perfil não permite esta ação. Quem administra concede as capacidades em Configurações → Perfis de Acesso.';
  }
  return mensagem;
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
