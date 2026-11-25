import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard'
import { PortfolioKPIBar } from '@/components/portfolio/PortfolioKPIBar'
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters'
import { usePortfolioProjects, PortfolioProject } from '@/hooks/usePortfolioProjects'
import { AppLayout } from '@/components/layout/AppLayout'
import { useCatalogoDosProjetos } from '@/hooks/useCatalogoDosProjetos'
import { FILTRO_VAZIO, servicosDoFiltro, type EscolhaDoFiltro } from '@/lib/catalogo'
import { useAuth } from '@/contexts/AuthContext'
import { useHideValuesPreference } from '@/contexts/HideValuesContext'
import { alertsOf, portfolioKpis, portfolioMargin } from '@/lib/portfolioBoard'
import { usePortfolioForecasts } from '@/hooks/usePortfolioForecasts'
import { usePortfolioGoals } from '@/hooks/usePortfolioGoals'
import { usePlanningReadiness } from '@/hooks/useProjectPlanning'
import { planningAlerts } from '@/lib/projectPlanning'
import { PORTFOLIO_STAGE, type PortfolioScope } from '@/types/portfolio'

/**
 * Portfólio de Projetos (US-0034, US-0035): indicadores com o período escrito, quadro com
 * Planejamento, Entrega de Valor, Encerramento (pela data de fim) e Concluído no ano.
 * Sem visão em lista e sem selo de alcance: o alcance é o filtro "Meus projetos | Todos".
 */
export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState('')
  const [clientId, setClientId] = useState('')
  const [escolha, setEscolha] = useState<EscolhaDoFiltro>(FILTRO_VAZIO)
  const { services } = useCatalogoDosProjetos()
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [scope, setScope] = useState<PortfolioScope>('all')
  const [hideValues] = useHideValuesPreference()
  const { employee } = useAuth()
  const isAdmin = employee?.isAdmin ?? false
  const didApplyInitialScope = useRef(false)

  useEffect(() => {
    // O GP abre nos próprios projetos; o admin, em todos. É escolha da tela: a leitura e a
    // escrita continuam governadas pelo RLS (.harness/patterns/security.md).
    if (didApplyInitialScope.current || !employee?.id) return
    setScope(isAdmin ? 'all' : 'mine')
    didApplyInitialScope.current = true
  }, [employee?.id, isAdmin])

  const canEditProject = (project: PortfolioProject) => isAdmin || project.manager_id === employee?.id

  const { data: projects = [], isLoading } = usePortfolioProjects(searchQuery, {
    clientId,
    servicos: servicosDoFiltro(escolha, services),
    managerId: scope === 'mine' ? employee?.id ?? '' : '',
  })
  const yearNumber = Number(year)
  const today = format(new Date(), 'yyyy-MM-dd')
  const kpis = useMemo(() => portfolioKpis(projects, yearNumber), [projects, yearNumber])
  const { data: goals = null } = usePortfolioGoals(yearNumber)
  const forecasts = usePortfolioForecasts(projects)
  const margin = useMemo(() => portfolioMargin([...forecasts.byProject.values()]), [forecasts.byProject])
  const planningProjects = useMemo(
    () =>
      projects
        .filter((project) => project.portfolio_stage === PORTFOLIO_STAGE.PLANNING)
        .map((project) => ({ ...project, hasClient: Boolean(project.client) })),
    [projects],
  )
  const { data: readiness } = usePlanningReadiness(planningProjects)
  const planningOf = useCallback((project: PortfolioProject) => readiness?.get(project.id), [readiness])
  const projectAlerts = useCallback(
    (project: PortfolioProject) => [
      ...alertsOf(project, today, forecasts.byProject.get(project.id), hideValues),
      ...planningAlerts(readiness?.get(project.id)),
    ],
    [today, forecasts.byProject, hideValues, readiness],
  )

  return (
    <AppLayout title='Portfólio de Projetos' description='Projetos em execução, receita do ano e o que vem a seguir.'>
      <div className='flex flex-col gap-4'>
        <PortfolioKPIBar
          kpis={kpis}
          year={yearNumber}
          scopeLabel={scope === 'mine' ? 'Meus projetos' : 'Todos os projetos'}
          goals={goals}
          margin={margin}
          isLoading={isLoading}
          isMarginLoading={forecasts.isLoading}
        />

        <div className='flex flex-wrap items-center gap-3'>
          <PortfolioFilters
            clientId={clientId}
            escolha={escolha}
            year={year}
            scope={scope}
            onClientChange={setClientId}
            onEscolhaChange={setEscolha}
            onYearChange={setYear}
            onScopeChange={setScope}
          />
          <div className='relative min-w-[260px] flex-1'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Buscar por projeto, cliente ou gerente...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='w-full pl-9'
              aria-label='Buscar projeto'
            />
          </div>
        </div>

        {isLoading ? (
          <div className='grid grid-cols-[repeat(4,minmax(260px,1fr))] gap-4 overflow-x-auto'>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className='mb-2 h-10 w-full rounded-t-lg' />
                <Skeleton className='h-32 w-full' />
                <Skeleton className='mt-2 h-32 w-full' />
              </div>
            ))}
          </div>
        ) : (
          <PortfolioKanbanBoard
            projects={projects}
            year={yearNumber}
            today={today}
            canEditProject={canEditProject}
            hideValues={hideValues}
            alertsOf={projectAlerts}
            planningOf={planningOf}
          />
        )}
      </div>
    </AppLayout>
  )
}
