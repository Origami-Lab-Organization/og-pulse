import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useHolidays } from '@/hooks/useHolidays';
import { buscarDadosDeCobranca } from '@/services/unloggedHoursService';
import { montarLinha, type LinhaDeHorasNaoLancadas } from '@/lib/unloggedHours';

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
  /** Planejado que não virou hora. Só faz sentido onde existe planejamento. */
  naoRealizado: number;
  pessoas: { employeeId: string; nome: string; planejado: number; apontado: number }[];
}

export interface RelatorioDeHorasNaoLancadas {
  linhas: LinhaDeHorasNaoLancadas[];
  /** A mesma verdade, vista por projeto. Alimenta o modo "Por projeto". */
  frentes: LinhaDeFrente[];
  totalCapacidade: number;
  totalLancado: number;
  totalNaoLancadas: number;
  /** Quantas pessoas estão abaixo de 90% da capacidade lançada. */
  pessoasEmAtraso: number;
}

const VAZIO: RelatorioDeHorasNaoLancadas = {
  linhas: [],
  frentes: [],
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

    const { pessoas, lancadoPorPessoa, planejadoPorPessoa, ausenciasPorPessoa, frentesPorPessoa } =
      consulta.data;

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

    return {
      linhas,
      frentes: pivotarPorFrente(linhas),
      totalCapacidade: linhas.reduce((s, l) => s + l.capacidade, 0),
      totalLancado: linhas.reduce((s, l) => s + l.lancado, 0),
      totalNaoLancadas: linhas.reduce((s, l) => s + l.naoLancadas, 0),
      pessoasEmAtraso: linhas.filter((l) => l.cobertura < 90).length,
    };
  }, [consulta.data, feriados, periodo.startDate, periodo.endDate]);

  return { ...consulta, relatorio };
}

/**
 * A mesma verdade, do outro lado: o que cada projeto planejou e o que recebeu de hora.
 *
 * Aqui o buraco é `planejado - apontado`, e NÃO "horas não lançadas". São perguntas
 * diferentes: a jornada é da pessoa e o planejamento é do projeto. Alguém pode estar em dia
 * com a jornada e ainda assim ter deixado um projeto sem as horas que ele esperava.
 */
function pivotarPorFrente(linhas: LinhaDeHorasNaoLancadas[]): LinhaDeFrente[] {
  const porFrente = new Map<string, LinhaDeFrente>();

  for (const linha of linhas) {
    for (const frente of linha.frentes) {
      const atual = porFrente.get(frente.id) ?? {
        id: frente.id,
        nome: frente.nome,
        tipo: frente.tipo,
        planejado: 0,
        apontado: 0,
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
    frente.naoRealizado = Math.max(0, frente.planejado - frente.apontado);
    frente.pessoas.sort((a, b) => b.planejado - a.planejado || b.apontado - a.apontado);
  }

  return frentes.sort((a, b) => b.naoRealizado - a.naoRealizado || b.planejado - a.planejado);
}
