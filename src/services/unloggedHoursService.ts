import { supabase } from '@/integrations/supabase/client';
import type { PeriodoDeAusencia, PessoaParaCobranca } from '@/lib/unloggedHours';

/**
 * As consultas do relatório de horas não lançadas (PUL-182).
 *
 * Separado da regra (`@/lib/unloggedHours`) porque a regra é o que muda de opinião e precisa
 * ser lida sem banco no meio. Aqui só se busca e se soma.
 */

export interface DadosDeCobranca {
  pessoas: PessoaParaCobranca[];
  lancadoPorPessoa: Map<string, number>;
  planejadoPorPessoa: Map<string, number>;
  ausenciasPorPessoa: Map<string, PeriodoDeAusencia[]>;
}

interface Janela {
  inicio: string;
  fim: string;
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
    };
  }

  const [horasProjeto, horasAtividade, planejado, ausencias] = await Promise.all([
    somarHorasDeProjeto(ids, janela),
    somarHorasDeAtividade(ids, janela),
    somarPlanejado(ids, janela),
    buscarAusenciasAprovadas(ids, janela),
  ]);

  const lancadoPorPessoa = new Map(horasProjeto);
  for (const [id, horas] of horasAtividade) {
    lancadoPorPessoa.set(id, (lancadoPorPessoa.get(id) ?? 0) + horas);
  }

  return { pessoas, lancadoPorPessoa, planejadoPorPessoa: planejado, ausenciasPorPessoa: ausencias };
}

/**
 * Quem o relatório cobra: pessoa ativa que LANÇA hora.
 *
 * `aloca_em_projetos = false` é o flag cujo rótulo na ficha é "Não lança horas" (PUL-218).
 * Quem está marcado assim tem centro de custo vinculado e o custo dele cai inteiro lá — não
 * há o que cobrar, e incluí-lo encheria a lista de falso devedor.
 */
async function buscarQuemLancaHora(tenantId: string): Promise<PessoaParaCobranca[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, nome, cargo, jornada_diaria, data_admissao, termination:employee_terminations(termination_date)')
    .eq('tenant_id', tenantId)
    .eq('aloca_em_projetos', true)
    // Quem trabalha e lança hora. `em_desligamento` ENTRA de propósito: está cumprindo
    // aviso, trabalhando e sendo pago — a hora dele é exatamente a que não pode sumir do
    // custo. Ficam de fora `desligado`, `arquivado`, `bloqueado` (não consegue nem entrar
    // no sistema) e `aguardando_confirmacao` (ainda não começou).
    .in('status', ['ativo', 'em_desligamento'])
    .order('nome');

  if (error) {
    console.error('Error fetching employees for unlogged hours:', error);
    throw error;
  }

  return (data ?? []).map((e) => {
    const termination = e.termination as { termination_date: string }[] | { termination_date: string } | null;
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
    };
  });
}

/**
 * Hora de projeto chega pelo vínculo (`project_members`), não pelo funcionário: é assim que
 * `project_timesheets` guarda quem lançou.
 */
async function somarHorasDeProjeto(ids: string[], janela: Janela): Promise<Map<string, number>> {
  const { data: membros, error: erroMembros } = await supabase
    .from('project_members')
    .select('id, employee_id')
    .in('employee_id', ids);

  if (erroMembros) {
    console.error('Error fetching project members:', erroMembros);
    throw erroMembros;
  }

  const pessoaPorMembro = new Map((membros ?? []).map((m) => [m.id, m.employee_id]));
  if (pessoaPorMembro.size === 0) return new Map();

  const { data, error } = await supabase
    .from('project_timesheets')
    .select('project_member_id, hours')
    .in('project_member_id', [...pessoaPorMembro.keys()])
    .gte('work_date', janela.inicio)
    .lte('work_date', janela.fim);

  if (error) {
    console.error('Error fetching project timesheets:', error);
    throw error;
  }

  const total = new Map<string, number>();
  for (const linha of data ?? []) {
    const employeeId = pessoaPorMembro.get(linha.project_member_id);
    if (!employeeId) continue;
    total.set(employeeId, (total.get(employeeId) ?? 0) + (Number(linha.hours) || 0));
  }
  return total;
}

async function somarHorasDeAtividade(ids: string[], janela: Janela): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('activity_timesheets')
    .select('employee_id, hours')
    .in('employee_id', ids)
    .gte('work_date', janela.inicio)
    .lte('work_date', janela.fim);

  if (error) {
    console.error('Error fetching activity timesheets:', error);
    throw error;
  }

  const total = new Map<string, number>();
  for (const linha of data ?? []) {
    total.set(linha.employee_id, (total.get(linha.employee_id) ?? 0) + (Number(linha.hours) || 0));
  }
  return total;
}

/**
 * Planejado de alocação que toca a janela.
 *
 * A alocação é por (ano, mês), então a janela vira intervalo de meses. É contexto na tela e
 * não a base da cobrança — ver o cabeçalho de `@/lib/unloggedHours`.
 */
async function somarPlanejado(ids: string[], janela: Janela): Promise<Map<string, number>> {
  const de = new Date(janela.inicio + 'T00:00:00');
  const ate = new Date(janela.fim + 'T00:00:00');

  const { data, error } = await supabase
    .from('project_role_allocations')
    .select('employee_id, year, month, planned_hours')
    .in('employee_id', ids);

  if (error) {
    console.error('Error fetching planned allocations:', error);
    throw error;
  }

  const total = new Map<string, number>();
  for (const linha of data ?? []) {
    const mes = new Date(linha.year, linha.month - 1, 1);
    if (mes < new Date(de.getFullYear(), de.getMonth(), 1)) continue;
    if (mes > new Date(ate.getFullYear(), ate.getMonth(), 1)) continue;
    total.set(linha.employee_id, (total.get(linha.employee_id) ?? 0) + (Number(linha.planned_hours) || 0));
  }
  return total;
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
