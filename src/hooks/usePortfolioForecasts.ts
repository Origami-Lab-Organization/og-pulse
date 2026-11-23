import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useHolidays } from '@/hooks/useHolidays';
import { useFinancialSettingsVersions } from '@/hooks/useFinancialSettings';
import { fetchPortfolioProjectForecast } from '@/services/portfolioForecastService';
import type { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_STAGE, type PortfolioProjectForecast } from '@/types/portfolio';

/**
 * Forecast dos projetos em andamento do portfólio (margem do portfólio e sino de pendências).
 * Um projeto por consulta, em paralelo e com cache: abrir o projeto depois reaproveita pouco,
 * mas voltar ao portfólio não recalcula.
 */
export function usePortfolioForecasts(projects: PortfolioProject[]) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const { data: holidays } = useHolidays();
  const { data: settingsVersions } = useFinancialSettingsVersions();
  const active = useMemo(() => projects.filter((p) => p.portfolio_stage !== PORTFOLIO_STAGE.COMPLETED), [projects]);
  const ready = !!tenantId && !!holidays && !!settingsVersions;

  const results = useQueries({
    queries: active.map((project) => ({
      queryKey: ['portfolio-forecast', project.id],
      queryFn: () =>
        fetchPortfolioProjectForecast({
          projectId: project.id,
          tenantId: tenantId!,
          holidays: holidays!,
          settingsVersions: settingsVersions!,
          today: new Date(),
        }),
      enabled: ready,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const byProject = useMemo(() => {
    const map = new Map<string, PortfolioProjectForecast>();
    results.forEach((result) => {
      if (result.data) map.set(result.data.projectId, result.data);
    });
    return map;
    // `results` muda de identidade a cada render; a chave é o conjunto de dados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map((r) => r.dataUpdatedAt).join(',')]);

  const isLoading = !ready || results.some((result) => result.isLoading);
  return { byProject, isLoading };
}
