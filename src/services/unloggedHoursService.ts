import { supabase } from '@/integrations/supabase/client';
import type { PeriodoDeAusencia, PessoaParaCobranca } from '@/lib/unloggedHours';

/**
 * As consultas do relatório de horas não lançadas (PUL-182).
 *
 * Separado da regra (`@/lib/unloggedHours`) porque a regra é o que muda de opinião e precisa
 * ser lida sem banco no meio. Aqui só se busca e se soma.
 */

/** Uma frente onde a pessoa tem hora planejada, apontada, ou as duas. */
export interface FrenteDaPessoa {
  id: string;
  nome: string;
  /** Planejado só existe em projeto; atividade interna não tem alocação. */
  planejado: number;
  apontado: number;
  tipo: 'projeto' | 'atividade';
}

export interface DadosDeCobranca {
  pessoas: PessoaParaCobranca[];
  lancadoPorPessoa: Map<string, number>;
  planejadoPorPessoa: Map<string, number>;
  ausenciasPorPessoa: Map<string, PeriodoDeAusencia[]>;
  /** Onde cada um planejou e apontou, para a linha poder abrir. */
  frentesPorPessoa: Map<string, FrenteDaPessoa[]>;
}

interface Janela {
  inicio: string;
  fim: string;
}

/** Horas de uma pessoa quebradas por frente: id da frente -> horas. */
type PorFrente = Map<string, Map<string, number>>;

interface Colhido {
  porPessoa: PorFrente;
  nomes: Map<string, string>;
}

export async function buscarDadosDeCobranca(
  tenantId: string,
  janela: Janela,
): Promise<DadosDeCobranca> {
  const pessoas = await buscarQuemLancaHora(tenantId);
  const ids = pessoas.map((p) => p.id);
  if (ids.length === 0) {
    return {
      pessoas,
      lancadoPorPessoa: new Map(),
      planejadoPorPessoa: new Map(),
      ausenciasPorPessoa: new Map(),
      frentesPorPessoa: new Map(),
    };
  }

  const [projeto, atividade, planejado, ausencias] = await Promise.all([
    horasDeProjeto(ids, janela),
    horasDeAtividade(ids, janela),
    planejadoDeProjeto(ids, janela),
    buscarAusenciasAprovadas(ids, janela),
  ]);

  const nomes = new Map([...projeto.nomes, ...atividade.nomes, ...planejado.nomes]);

  return {
    pessoas,
    lancadoPorPessoa: somarFrentes(ids, [projeto.porPessoa, atividade.porPessoa]),
    planejadoPorPessoa: somarFrentes(ids, [planejado.porPessoa]),
    ausenciasPorPessoa: ausencias,
    frentesPorPessoa: montarFrentes(ids, { projeto, atividade, planejado }, nomes),
  };
}

/** O total por pessoa, somando as frentes de cada mapa. */
function somarFrentes(ids: string[], mapas: PorFrente[]): Map<string, number> {
  const total = new Map<string, number>();
  for (const id of ids) {
    let soma = 0;
    for (const mapa of mapas) {
      for (const horas of mapa.get(id)?.values() ?? []) soma += horas;
    }
    if (soma > 0) total.set(id, soma);
  }
  return total;
}

/**
 * A lista que a linha expandida mostra.
 *
 * Projeto com planejado mas SEM apontamento é o caso mais interessante do relatório — é
 * exatamente "onde era para ter hora e não teve" —, então ele precisa aparecer com apontado
 * zero em vez de sumir da lista.
 */
function montarFrentes(
  ids: string[],
  fontes: { projeto: Colhido; atividade: Colhido; planejado: Colhido },
  nomes: Map<string, string>,
): Map<string, FrenteDaPessoa[]> {
  const porPessoa = new Map<string, FrenteDaPessoa[]>();
  for (const id of ids) {
    const frentes = frentesDeUmaPessoa(id, fontes, nomes);
    if (frentes.length > 0) porPessoa.set(id, frentes);
  }
  return porPessoa;
}

function frentesDeUmaPessoa(
  id: string,
  fontes: { projeto: Colhido; atividade: Colhido; planejado: Colhido },
  nomes: Map<string, string>,
): FrenteDaPessoa[] {
  const apontado = fontes.projeto.porPessoa.get(id) ?? new Map<string, number>();
  const planejado = fontes.planejado.porPessoa.get(id) ?? new Map<string, number>();
  const atividades = fontes.atividade.porPessoa.get(id) ?? new Map<string, number>();

  const projetos = [...new Set([...apontado.keys(), ...planejado.keys()])].map((projectId) => ({
    id: projectId,
    nome: nomes.get(projectId) ?? 'Projeto sem nome',
    planejado: planejado.get(projectId) ?? 0,
    apontado: apontado.get(projectId) ?? 0,
    tipo: 'projeto' as const,
  }));

  const internas = [...atividades].map(([activityId, horas]) => ({
    id: activityId,
    nome: nomes.get(activityId) ?? 'Atividade sem nome',
    planejado: 0,
    apontado: horas,
    tipo: 'atividade' as const,
  }));

  return [...projetos, ...internas].sort(
    (a, b) => b.planejado - a.planejado || b.apontado - a.apontado,
  );
}

/**
 * Quem o relatório cobra: pessoa que trabalha e LANÇA hora.
 *
 * `aloca_em_projetos = false` é o flag cujo rótulo na ficha é "Não lança horas" (PUL-218).
 * Quem está marcado assim tem centro de custo vinculado e o custo dele cai inteiro lá — não
 * há o que cobrar, e incluí-lo encheria a lista de falso devedor.
 */
async function buscarQuemLancaHora(tenantId: string): Promise<PessoaParaCobranca[]> {
  const { data, error } = await supabase
    .from('employees')
    // A chave vai NOMEADA porque existem DUAS relações entre as tabelas, em direções
    // opostas: `employee_terminations.employee_id -> employees` (esta) e
    // `employees.termination_id -> employee_terminations`. Sem o nome, o PostgREST não
    // adivinha qual o embed quer e devolve PGRST201.
    .select('id, nome, cargo, status, jornada_diaria, data_admissao, termination:employee_terminations!employee_terminations_employee_id_fkey(termination_date)')
    .eq('tenant_id', tenantId)
    .eq('aloca_em_projetos', true)
    // Quem SAIU continua entrando, e é a DATA que decide, não o status: em setembro de um
    // ano passado a pessoa trabalhava, e a jornada dela daquele mês tem de ser cobrada como
    // a de qualquer outro. Filtrar por `status = 'ativo'` apagaria do relatório todo mês
    // anterior a uma saída — o passado mudaria de resposta a cada desligamento.
    //
    // Fora fica só quem NUNCA começou: `aguardando_confirmacao` não tem jornada nenhuma.
    .neq('status', 'aguardando_confirmacao')
    .order('nome');

  if (error) {
    console.error('Error fetching employees for unlogged hours:', error);
    throw error;
  }

  return (data ?? [])
    .map(paraPessoa)
    // Marcado como fora da empresa mas SEM data de saída: não dá para saber até quando ele
    // devia jornada, e chutar "para sempre" criaria um devedor eterno. Fica de fora, e o
    // conserto é registrar o desligamento.
    .filter((p) => !(p.saiuDaEmpresa && !p.dataDesligamento));
}

/** Status que dizem "não trabalha mais aqui". A data de saída é que diz desde quando. */
const SAIU_DA_EMPRESA = new Set(['desligado', 'arquivado']);

function paraPessoa(e: LinhaDeFuncionario): PessoaParaCobranca & { saiuDaEmpresa: boolean } {
  const termination = e.termination;
  const desligamento = Array.isArray(termination)
    ? (termination[0]?.termination_date ?? null)
    : (termination?.termination_date ?? null);
  return {
    id: e.id,
    nome: e.nome,
    cargo: e.cargo ?? null,
    jornadaDiaria: Number(e.jornada_diaria) || 0,
    dataAdmissao: e.data_admissao ?? null,
    dataDesligamento: desligamento,
    saiuDaEmpresa: SAIU_DA_EMPRESA.has(e.status ?? ''),
  };
}

interface LinhaDeFuncionario {
  id: string;
  nome: string;
  cargo: string | null;
  status: string | null;
  jornada_diaria: number | null;
  data_admissao: string | null;
  termination: { termination_date: string }[] | { termination_date: string } | null;
}

function acumular(mapa: PorFrente, employeeId: string, frenteId: string, horas: number): void {
  const porFrente = mapa.get(employeeId) ?? new Map<string, number>();
  porFrente.set(frenteId, (porFrente.get(frenteId) ?? 0) + horas);
  mapa.set(employeeId, porFrente);
}

/**
 * Hora de projeto chega pelo vínculo (`project_members`), não pelo funcionário: é assim que
 * `project_timesheets` guarda quem lançou.
 */
async function horasDeProjeto(ids: string[], janela: Janela): Promise<Colhido> {
  const { data: membros, error: erroMembros } = await supabase
    .from('project_members')
    .select('id, employee_id, project_id, project:projects(name)')
    .in('employee_id', ids);

  if (erroMembros) {
    console.error('Error fetching project members:', erroMembros);
    throw erroMembros;
  }

  const { porMembro, nomes } = indexarMembros(membros ?? []);
  if (porMembro.size === 0) return { porPessoa: new Map(), nomes };

  const { data, error } = await supabase
    .from('project_timesheets')
    .select('project_member_id, hours')
    .in('project_member_id', [...porMembro.keys()])
    .gte('work_date', janela.inicio)
    .lte('work_date', janela.fim);

  if (error) {
    console.error('Error fetching project timesheets:', error);
    throw error;
  }

  const porPessoa: PorFrente = new Map();
  for (const linha of data ?? []) {
    const membro = porMembro.get(linha.project_member_id);
    if (!membro) continue;
    acumular(porPessoa, membro.employeeId, membro.projectId, Number(linha.hours) || 0);
  }
  return { porPessoa, nomes };
}

interface LinhaDeMembro {
  id: string;
  employee_id: string;
  project_id: string;
  project: { name: string } | null;
}

/** Vínculo -> pessoa e projeto, mais o nome de cada projeto que apareceu. */
function indexarMembros(membros: unknown[]) {
  const nomes = new Map<string, string>();
  const porMembro = new Map<string, { employeeId: string; projectId: string }>();
  for (const bruto of membros) {
    const m = bruto as LinhaDeMembro;
    porMembro.set(m.id, { employeeId: m.employee_id, projectId: m.project_id });
    if (m.project?.name) nomes.set(m.project_id, m.project.name);
  }
  return { porMembro, nomes };
}

async function horasDeAtividade(ids: string[], janela: Janela): Promise<Colhido> {
  const { data, error } = await supabase
    .from('activity_timesheets')
    .select('employee_id, activity_type_id, hours, activity:activity_types(name)')
    .in('employee_id', ids)
    .gte('work_date', janela.inicio)
    .lte('work_date', janela.fim);

  if (error) {
    console.error('Error fetching activity timesheets:', error);
    throw error;
  }

  const porPessoa: PorFrente = new Map();
  const nomes = new Map<string, string>();
  for (const linha of data ?? []) {
    const nome = (linha.activity as { name: string } | null)?.name;
    if (nome) nomes.set(linha.activity_type_id, nome);
    acumular(porPessoa, linha.employee_id, linha.activity_type_id, Number(linha.hours) || 0);
  }
  return { porPessoa, nomes };
}

/**
 * Planejado de alocação que toca a janela.
 *
 * A alocação é por (ano, mês), então a janela vira intervalo de meses. É contexto na tela e
 * não a base da cobrança — ver o cabeçalho de `@/lib/unloggedHours`.
 */
async function planejadoDeProjeto(ids: string[], janela: Janela): Promise<Colhido> {
  const de = new Date(janela.inicio + 'T00:00:00');
  const ate = new Date(janela.fim + 'T00:00:00');
  const primeiroMes = new Date(de.getFullYear(), de.getMonth(), 1);
  const ultimoMes = new Date(ate.getFullYear(), ate.getMonth(), 1);

  const { data, error } = await supabase
    .from('project_role_allocations')
    .select('employee_id, project_id, year, month, planned_hours, project:projects(name)')
    .in('employee_id', ids);

  if (error) {
    console.error('Error fetching planned allocations:', error);
    throw error;
  }

  const porPessoa: PorFrente = new Map();
  const nomes = new Map<string, string>();
  for (const linha of data ?? []) {
    const mes = new Date(linha.year, linha.month - 1, 1);
    if (mes < primeiroMes || mes > ultimoMes) continue;
    const horas = Number(linha.planned_hours) || 0;
    if (horas === 0) continue;
    const nome = (linha.project as { name: string } | null)?.name;
    if (nome) nomes.set(linha.project_id, nome);
    acumular(porPessoa, linha.employee_id, linha.project_id, horas);
  }
  return { porPessoa, nomes };
}

/**
 * Só férias APROVADAS saem da capacidade. Pedido pendente ou recusado não vira folga, e
 * descontar antes da aprovação deixaria o relatório frouxo justo com quem ainda não tem o
 * direito reconhecido.
 */
async function buscarAusenciasAprovadas(
  ids: string[],
  janela: Janela,
): Promise<Map<string, PeriodoDeAusencia[]>> {
  const { data, error } = await supabase
    .from('vacation_requests')
    .select('employee_id, start_date, end_date')
    .in('employee_id', ids)
    .eq('status', 'approved')
    .lte('start_date', janela.fim)
    .gte('end_date', janela.inicio);

  if (error) {
    console.error('Error fetching approved vacations:', error);
    throw error;
  }

  const porPessoa = new Map<string, PeriodoDeAusencia[]>();
  for (const linha of data ?? []) {
    const lista = porPessoa.get(linha.employee_id) ?? [];
    lista.push({ start_date: linha.start_date, end_date: linha.end_date });
    porPessoa.set(linha.employee_id, lista);
  }
  return porPessoa;
}
