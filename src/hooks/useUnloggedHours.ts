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

export interface RelatorioDeHorasNaoLancadas {
  linhas: LinhaDeHorasNaoLancadas[];
  totalCapacidade: number;
  totalLancado: number;
  totalNaoLancadas: number;
  /** Quantas pessoas estão abaixo de 90% da capacidade lançada. */
  pessoasEmAtraso: number;
}

const VAZIO: RelatorioDeHorasNaoLancadas = {
  linhas: [],
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
  const { data: feriados = [] } = useHolidays();

  const inicio = format(periodo.startDate, 'yyyy-MM-dd');
  const fim = format(periodo.endDate, 'yyyy-MM-dd');

  const consulta = useQuery({
    queryKey: ['unlogged-hours', tenantId, inicio, fim],
    queryFn: () => buscarDadosDeCobranca(tenantId!, { inicio, fim }),
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
      totalCapacidade: linhas.reduce((s, l) => s + l.capacidade, 0),
      totalLancado: linhas.reduce((s, l) => s + l.lancado, 0),
      totalNaoLancadas: linhas.reduce((s, l) => s + l.naoLancadas, 0),
      pessoasEmAtraso: linhas.filter((l) => l.cobertura < 90).length,
    };
  }, [consulta.data, feriados, periodo.startDate, periodo.endDate]);

  return { ...consulta, relatorio };
}
