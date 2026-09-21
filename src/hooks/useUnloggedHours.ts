import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useHolidays } from '@/hooks/useHolidays';
import type { Holiday } from '@/lib/workingDays';
import { buscarDadosDeCobranca } from '@/services/unloggedHoursService';
import {
  decorridoDoPeriodo,
  montarLinha,
  type Decorrido,
  type LinhaDeHorasNaoLancadas,
} from '@/lib/unloggedHours';

export interface PeriodoDeCobranca {
  startDate: Date;
  endDate: Date;
}

/** Uma frente vista de cima: o projeto (ou a atividade) com o time todo dentro. */
export interface LinhaDeFrente {
  id: string;
  nome: string;
  tipo: 'projeto' | 'atividade';
  planejado: number;
  apontado: number;
  /**
   * O quanto do planejado já devia ter virado hora, em pro-rata por dias úteis (ADR-0018).
   * Em mês fechado é igual ao planejado.
   */
  esperadoAteHoje: number;
  /** Esperado até hoje que não virou hora. Só faz sentido onde existe planejamento. */
  naoRealizado: number;
  pessoas: { employeeId: string; nome: string; planejado: number; apontado: number }[];
}

export interface RelatorioDeHorasNaoLancadas {
  linhas: LinhaDeHorasNaoLancadas[];
  /** A mesma verdade, vista por projeto. Alimenta o modo "Por projeto". */
  frentes: LinhaDeFrente[];
  /** Quanto do mês já passou. A tela avisa quando o número ainda é parcial. */
  decorrido: Decorrido;
  totalCapacidade: number;
  totalLancado: number;
  totalNaoLancadas: number;
  /** Quantas pessoas estão abaixo de 90% da capacidade lançada. */
  pessoasEmAtraso: number;
}

const VAZIO: RelatorioDeHorasNaoLancadas = {
  linhas: [],
  frentes: [],
  decorrido: { diasUteis: 0, diasUteisDecorridos: 0, fracao: 0, emAndamento: false },
  totalCapacidade: 0,
  totalLancado: 0,
  totalNaoLancadas: 0,
  pessoasEmAtraso: 0,
};

/**
 * O relatório de horas não lançadas (PUL-182).
 *
 * A busca fica no serviço e a regra em `@/lib/unloggedHours`; aqui só se junta uma com a
 * outra. Os feriados vêm do mesmo hook que o resto do sistema usa, para a contagem de dias
 * úteis não divergir entre telas.
 */
export function useUnloggedHours(periodo: PeriodoDeCobranca) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  // Admin vê a empresa; quem não é admin vê o time dos projetos que gerencia. Mesmo recorte
  // que o resto das Análises aplica, para as telas não discordarem sobre o que é "meu time".
  const managerId = employee?.isAdmin ? null : (employee?.id ?? null);
  const { data: feriados = [] } = useHolidays();

  const inicio = format(periodo.startDate, 'yyyy-MM-dd');
  const fim = format(periodo.endDate, 'yyyy-MM-dd');

  const consulta = useQuery({
    queryKey: ['unlogged-hours', tenantId, inicio, fim, managerId],
    queryFn: () => buscarDadosDeCobranca(tenantId!, { inicio, fim }, { managerId }),
    enabled: !!tenantId,
  });

  const relatorio = useMemo<RelatorioDeHorasNaoLancadas>(() => {
    if (!consulta.data) return VAZIO;

    const {
      pessoas,
      lancadoPorPessoa,
      planejadoPorPessoa,
      ausenciasPorPessoa,
      frentesPorPessoa,
      fimDoProjeto,
    } = consulta.data;

    const linhas = pessoas
      .map((pessoa) =>
        montarLinha(
          {
            pessoa,
            lancado: lancadoPorPessoa.get(pessoa.id) ?? 0,
            planejado: planejadoPorPessoa.get(pessoa.id) ?? 0,
            ausencias: ausenciasPorPessoa.get(pessoa.id) ?? [],
            frentes: frentesPorPessoa.get(pessoa.id) ?? [],
          },
          periodo.startDate,
          periodo.endDate,
          feriados,
        ),
      )
      // Quem não tem capacidade no período sai da lista: admitido depois, desligado antes ou
      // de férias o período inteiro. Não é devedor, é gente que não tinha o que lançar.
      .filter((linha) => linha.capacidade > 0)
      .sort((a, b) => b.naoLancadas - a.naoLancadas);

    const decorrido = decorridoDoPeriodo(periodo.startDate, periodo.endDate, feriados);

    return {
      linhas,
      frentes: pivotarPorFrente(linhas, periodo, feriados, fimDoProjeto),
      decorrido,
      totalCapacidade: linhas.reduce((s, l) => s + l.capacidade, 0),
      totalLancado: linhas.reduce((s, l) => s + l.lancado, 0),
      totalNaoLancadas: linhas.reduce((s, l) => s + l.naoLancadas, 0),
      pessoasEmAtraso: linhas.filter((l) => l.cobertura < 90).length,
    };
  }, [consulta.data, feriados, periodo]);

  return { ...consulta, relatorio };
}

/**
 * A mesma verdade, do outro lado: o que cada projeto planejou e o que recebeu de hora.
 *
 * Aqui o buraco é `planejado - apontado`, e NÃO "horas não lançadas". São perguntas
 * diferentes: a jornada é da pessoa e o planejamento é do projeto. Alguém pode estar em dia
 * com a jornada e ainda assim ter deixado um projeto sem as horas que ele esperava.
 */
function pivotarPorFrente(
  linhas: LinhaDeHorasNaoLancadas[],
  periodo: PeriodoDeCobranca,
  feriados: Holiday[],
  fimDoProjeto: Map<string, string>,
): LinhaDeFrente[] {
  const porFrente = new Map<string, LinhaDeFrente>();
  const fimDoPeriodo = format(periodo.endDate, 'yyyy-MM-dd');
  const jaEncerrado = (projectId: string) => {
    const fim = fimDoProjeto.get(projectId);
    return !!fim && fim <= fimDoPeriodo;
  };

  // A fração é POR FRENTE, e não uma só para a tela: projeto que ainda vai acabar depois do
  // período é cobrado até hoje, como qualquer outro.
  const fracaoDe = (projectId: string) =>
    decorridoDaFrente(periodo, feriados, fimDoProjeto.get(projectId)).fracao;

  for (const linha of linhas) {
    for (const frente of linha.frentes) {
      // PROJETO JÁ CONCLUÍDO NÃO APARECE. Esta visão lista as frentes que ainda esperam
      // hora, e projeto encerrado não espera mais nada.
      //
      // O corte é "concluído até o fim do período OLHADO", não "concluído hoje": olhando
      // junho, um projeto encerrado em dezembro ainda estava vivo e continua na lista. Sem
      // isso o passado mudaria de resposta a cada encerramento.
      //
      // O preço: hora lançada num projeto já concluído some DESTA visão. Ela continua na
      // visão por pessoa e nos totais do topo — e, se existir, é problema de dado (alguém
      // apontando em projeto encerrado), não de leitura.
      if (frente.tipo === 'projeto' && jaEncerrado(frente.id)) continue;
      const atual = porFrente.get(frente.id) ?? {
        id: frente.id,
        nome: frente.nome,
        tipo: frente.tipo,
        planejado: 0,
        apontado: 0,
        esperadoAteHoje: 0,
        naoRealizado: 0,
        pessoas: [],
      };
      atual.planejado += frente.planejado;
      atual.apontado += frente.apontado;
      atual.pessoas.push({
        employeeId: linha.employeeId,
        nome: linha.nome,
        planejado: frente.planejado,
        apontado: frente.apontado,
      });
      porFrente.set(frente.id, atual);
    }
  }

  const frentes = [...porFrente.values()];
  for (const frente of frentes) {
    // Pro-rata por dias úteis (ADR-0018): no dia útil 15 de 22, só ~68% do planejado do mês
    // podia ter virado hora. Cobrar o planejado cheio faria todo projeto parecer abandonado
    // no começo do mês — a mesma distorção que a aba Equipe já resolve assim.
    frente.esperadoAteHoje = frente.planejado * fracaoDe(frente.id);
    frente.naoRealizado = Math.max(0, frente.esperadoAteHoje - frente.apontado);
    frente.pessoas.sort((a, b) => b.planejado - a.planejado || b.apontado - a.apontado);
  }

  return frentes.sort((a, b) => b.naoRealizado - a.naoRealizado || b.planejado - a.planejado);
}

/**
 * Quanto do período uma FRENTE podia consumir.
 *
 * O corte é o menor entre hoje e a data em que o projeto acabou. Sem isso, um projeto
 * concluído no dia 5 seria cobrado pelo mês inteiro — e era exatamente o caso do Moneteen,
 * concluído em setembro e ainda pedindo 88h. A migration de zeramento preserva o mês da
 * conclusão de propósito (a pessoa trabalhou parte dele), então quem tem de aparar o resto
 * é a leitura.
 */
function decorridoDaFrente(
  periodo: PeriodoDeCobranca,
  feriados: Holiday[],
  fim: string | undefined,
): Decorrido {
  if (!fim) return decorridoDoPeriodo(periodo.startDate, periodo.endDate, feriados);
  const fimDoProjeto = new Date(fim + 'T00:00:00');
  const ate = fimDoProjeto < periodo.endDate ? fimDoProjeto : periodo.endDate;
  if (ate < periodo.startDate) {
    return { diasUteis: 0, diasUteisDecorridos: 0, fracao: 0, emAndamento: false };
  }
  const recorte = decorridoDoPeriodo(periodo.startDate, ate, feriados);
  const total = decorridoDoPeriodo(periodo.startDate, periodo.endDate, feriados);
  // A fração é sobre o MÊS inteiro, não sobre o recorte: o planejado que se divide é o do mês.
  return {
    ...recorte,
    diasUteis: total.diasUteis,
    fracao: total.diasUteis > 0 ? recorte.diasUteisDecorridos / total.diasUteis : 0,
  };
}
