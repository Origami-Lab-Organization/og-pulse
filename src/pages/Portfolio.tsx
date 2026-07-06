import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard'
import { PortfolioTable } from '@/components/portfolio/PortfolioTable'
import { PortfolioKPIBar } from '@/components/portfolio/PortfolioKPIBar'
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters'
import { ProjectRemoveDialog } from '@/components/projects/ProjectRemoveDialog'
import {
  usePortfolioProjects,
  PortfolioProject,
} from '@/hooks/usePortfolioProjects'
import { useDeleteProject, useArchiveProject } from '@/hooks/useProjects'
import { Search, Eye, EyeOff } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useHideValuesPreference } from '@/contexts/HideValuesContext'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export default function Portfolio() {
  const [searchQuery, setSearchQuery] = useState('')
  const [clientId, setClientId] = useState('')
  const [serviceLine, setServiceLine] = useState('')
  const [managerId, setManagerId] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban')
  const [hideValues, setHideValues] = useHideValuesPreference()
  const [removeProject, setRemoveProject] = useState<PortfolioProject | null>(
    null,
  )
  const { employee } = useAuth()
  const isAdmin = employee?.isAdmin ?? false
  const isManager = employee?.is_gerente ?? false
  const canViewPortfolio = isAdmin || isManager
  const canFilterManagers = canViewPortfolio
  const didApplyInitialManagerFilter = useRef(false)

  useEffect(() => {
    // Seguindo .harness/patterns/security.md: o filtro inicial ajuda o fluxo do PM,
    // mas nao substitui a autorizacao por recurso aplicada nas acoes e no RLS.
    if (didApplyInitialManagerFilter.current || isAdmin || !isManager || !employee?.id) return
    setManagerId(employee.id)
    didApplyInitialManagerFilter.current = true
  }, [employee?.id, isAdmin, isManager])

  const canEditProject = (project: PortfolioProject) =>
    isAdmin || project.manager_id === employee?.id

  const { data: projects, isLoading } = usePortfolioProjects(searchQuery, {
    clientId,
    serviceLine,
    managerId,
    year: year ? Number(year) : undefined,
  })
  const deleteProject = useDeleteProject()
  const archiveProject = useArchiveProject()

  const handleRemoveProject = (project: PortfolioProject) => {
    if (!isAdmin) return
    setRemoveProject(project)
  }

  const scopeBadgeLabel = isAdmin
    ? 'Visão da empresa'
    : managerId === employee?.id
      ? 'Meus projetos'
      : managerId
        ? 'Filtro por gerente'
        : 'Todos os projetos'

  const scopeBadge = (
    <Badge
      variant='outline'
      className={isAdmin
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'
        : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
      }
    >
      {scopeBadgeLabel}
    </Badge>
  )

  const headerActions = (
    <div className='flex items-center gap-2'>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='icon'
            onClick={() => setHideValues(!hideValues)}
          >
            {hideValues ? (
              <EyeOff className='h-4 w-4' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        </TooltipContent>
      </Tooltip>
      {scopeBadge}
    </div>
  )

  return (
    <AppLayout
      title='Portfólio de Projetos'
      description='Acompanhe os projetos por status, cliente e gerente.'
      actions={headerActions}
    >
      <div className='flex flex-col gap-4 h-[calc(100vh-10rem)]'>
        {isLoading ? (
          <div className='flex gap-4 p-4 bg-muted/30 rounded-lg'>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className='min-w-[240px]'>
                <Skeleton className='h-10 w-full mb-2 rounded-t-lg' />
                <Skeleton className='h-32 w-full' />
                <Skeleton className='h-32 w-full mt-2' />
              </div>
            ))}
          </div>
        ) : (
          <>
            <PortfolioKPIBar projects={projects || []} hideValues={hideValues} />

            <div className='flex flex-wrap items-center gap-3'>
              <PortfolioFilters
                canFilterManagers={canFilterManagers}
                clientId={clientId}
                serviceLine={serviceLine}
                managerId={managerId}
                year={year}
                onClientChange={setClientId}
                onServiceLineChange={setServiceLine}
                onManagerChange={setManagerId}
                onYearChange={setYear}
              />
              <div className='relative flex-1 min-w-[280px]'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Buscar por projeto, cliente ou gerente...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-9 w-full'
                />
              </div>
              {/* View toggle */}
              <div className='flex items-center rounded-md border border-border overflow-hidden shrink-0'>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size='sm'
                  className='rounded-none h-9 px-3 text-sm'
                  onClick={() => setViewMode('kanban')}
                >
                  Kanban
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size='sm'
                  className='rounded-none h-9 px-3 text-sm'
                  onClick={() => setViewMode('table')}
                >
                  Lista
                </Button>
              </div>
            </div>

            {viewMode === 'kanban' ? (
              <div className='flex-1 overflow-auto bg-muted/30 rounded-lg'>
                <PortfolioKanbanBoard
                  projects={projects || []}
                  canEditProject={canEditProject}
                  onRemoveProject={isAdmin ? handleRemoveProject : undefined}
                  hideValues={hideValues}
                />
              </div>
            ) : (
              <div className='overflow-auto'>
                <PortfolioTable projects={projects || []} hideValues={hideValues} />
              </div>
            )}
          </>
        )}
      </div>

      {removeProject && (
        <ProjectRemoveDialog
          open={!!removeProject}
          onOpenChange={(open) => {
            if (!open) setRemoveProject(null)
          }}
          projectId={removeProject.id}
          projectName={removeProject.name}
          onDelete={() => {
            deleteProject.mutate(
              {
                id: removeProject.id,
                name: removeProject.name,
                withCascade: true,
              },
              { onSuccess: () => setRemoveProject(null) },
            )
          }}
          onArchive={() => {}}
          isProcessing={deleteProject.isPending || archiveProject.isPending}
        />
      )}
    </AppLayout>
  )
}
