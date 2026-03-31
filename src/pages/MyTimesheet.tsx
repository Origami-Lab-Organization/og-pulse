import { useState, useMemo, useCallback } from 'react'
import { MonthlyTimesheetView } from '@/components/timesheets/MonthlyTimesheetView'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Briefcase,
  Loader2,
  CheckCircle2,
  Send,
  Info,
  CircleAlert,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { MyTimesheetAllocation } from '@/components/timesheets/MyTimesheetAllocation'
import { useMyAllocationData } from '@/hooks/useMyAllocationData'
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector'
import { GlobalSaveIndicator } from '@/components/timesheets/GlobalSaveIndicator'
import { TimesheetWeekRow } from '@/components/timesheets/TimesheetWeekRow'
import type { SaveStatusInfo } from '@/components/timesheets/TimesheetWeekRow'
import { ActivityTimesheetRow } from '@/components/timesheets/ActivityTimesheetRow'
import { SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog'
import { useAuth } from '@/contexts/AuthContext'
import { useMyProjectMemberships } from '@/hooks/useMyTimesheetData'
import {
  useTimesheetsByDateRange,
  getWeekStart,
  getWeekDays,
} from '@/hooks/useTimesheetData'
import { useSubmitAllProjects } from '@/hooks/useTimesheetSubmissions'
import { useHolidays, isHoliday } from '@/hooks/useHolidays'
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes'
import { useActivityTimesheetsByRange } from '@/hooks/useActivityTimesheets'
import { Badge } from '@/components/ui/badge'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const MyTimesheet = () => {
  const { employee } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [weekSelectorMonth, setWeekSelectorMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [activitiesOpen, setActivitiesOpen] = useState(true)

  // Dialog states
  const [showSubmitAllDialog, setShowSubmitAllDialog] = useState(false)

  const weekStart = getWeekStart(selectedDate)
  const weekEnd = addDays(weekStart, 4)
  const weekDays = getWeekDays(weekStart)
  const startDate = format(weekStart, 'yyyy-MM-dd')
  const endDate = format(weekEnd, 'yyyy-MM-dd')
  const monthKey = format(weekStart, 'yyyy-MM')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const currentWeekStart = getWeekStart(new Date())
  const isFutureWeek = weekStart > currentWeekStart
  const allWeekDaysReady = weekEnd <= today
  const isFriday = today.getDay() === 5
  const isCurrentWeek = !isFutureWeek && weekStart <= today

  const { data: projects = [], isLoading: loadingProjects } =
    useMyProjectMemberships(employee?.id, startDate, endDate)
  const { data: timesheetEntries = [], isLoading: loadingEntries } =
    useTimesheetsByDateRange(startDate, endDate)
  const { data: myActivityTypes = [] } = useMyActivityTypes(
    employee?.id,
    endDate,
  )
  const { data: activityEntries = [] } = useActivityTimesheetsByRange(
    employee?.id,
    startDate,
    endDate,
  )

  const projectIds = useMemo(() => projects.map((p) => p.projectId), [projects])
  const myMemberIds = useMemo(
    () => projects.flatMap((p) => p.members.map((m) => m.memberId)),
    [projects],
  )

  const { data: holidays = [] } = useHolidays()
  const { data: allocationData } = useMyAllocationData(employee?.id, monthKey)

  // Set of project IDs that have no planned hours
  const unplannedProjectIds = useMemo(() => {
    const set = new Set<string>()
    if (allocationData) {
      for (const p of allocationData.projects) {
        if (p.plannedHours <= 0) set.add(p.projectId)
      }
    }
    return set
  }, [allocationData])

  const submitAllProjects = useSubmitAllProjects()

  const isLoading = loadingProjects || loadingEntries

  const projectHoursMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const project of projects) {
      const memberIds = project.members.map((m) => m.memberId)
      const hours = timesheetEntries
        .filter((e) => memberIds.includes(e.projectMemberId))
        .reduce((sum, e) => sum + e.hours, 0)
      map.set(project.projectId, hours)
    }
    return map
  }, [projects, timesheetEntries])

  const totalHoursAllProjects = useMemo(() => {
    let total = 0
    projectHoursMap.forEach((h) => (total += h))
    return total
  }, [projectHoursMap])

  // Compute daily totals across all projects + activities for soft limit validation
  const allDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const entry of timesheetEntries) {
      if (myMemberIds.includes(entry.projectMemberId)) {
        totals[entry.workDate] = (totals[entry.workDate] ?? 0) + entry.hours
      }
    }
    for (const entry of activityEntries) {
      totals[entry.work_date] = (totals[entry.work_date] ?? 0) + entry.hours
    }
    return totals
  }, [timesheetEntries, myMemberIds, activityEntries])

  // Track local (unsaved) totals per member for real-time footer
  const [localTotals, setLocalTotals] = useState<Record<string, number>>({})

  // Track per-day hours from each member row for daily totals footer
  const [localDayHours, setLocalDayHours] = useState<
    Record<string, Record<string, number>>
  >({})

  // Track local totals for activity rows
  const [localActivityTotals, setLocalActivityTotals] = useState<
    Record<string, number>
  >({})
  const [localActivityDayHours, setLocalActivityDayHours] = useState<
    Record<string, Record<string, number>>
  >({})

  // Track save status from all rows
  const [saveStatuses, setSaveStatuses] = useState<
    Record<string, SaveStatusInfo>
  >({})

  const handleLocalTotalChange = useCallback(
    (memberId: string, total: number) => {
      setLocalTotals((prev) => {
        if (prev[memberId] === total) return prev
        return { ...prev, [memberId]: total }
      })
    },
    [],
  )

  const handleLocalDayHoursChange = useCallback(
    (memberId: string, dayHours: Record<string, number>) => {
      setLocalDayHours((prev) => ({ ...prev, [memberId]: dayHours }))
    },
    [],
  )

  const handleSaveStatusChange = useCallback(
    (memberId: string, info: SaveStatusInfo) => {
      setSaveStatuses((prev) => ({ ...prev, [memberId]: info }))
    },
    [],
  )

  const handleActivityLocalTotalChange = useCallback(
    (activityTypeId: string, total: number) => {
      setLocalActivityTotals((prev) => {
        if (prev[activityTypeId] === total) return prev
        return { ...prev, [activityTypeId]: total }
      })
    },
    [],
  )

  const handleActivityLocalDayHoursChange = useCallback(
    (activityTypeId: string, dayHours: Record<string, number>) => {
      setLocalActivityDayHours((prev) => ({
        ...prev,
        [activityTypeId]: dayHours,
      }))
    },
    [],
  )

  // Aggregate save status across all rows
  const aggregatedSaveStatus = useMemo((): SaveStatusInfo => {
    const statuses = Object.values(saveStatuses)
    if (statuses.length === 0) return { status: 'idle' }
    if (statuses.some((s) => s.status === 'error')) return { status: 'error' }
    if (statuses.some((s) => s.status === 'saving')) return { status: 'saving' }
    if (statuses.some((s) => s.status === 'unsaved'))
      return { status: 'unsaved' }
    const savedStatuses = statuses.filter(
      (s) => s.status === 'saved' && s.lastSavedAt,
    )
    if (savedStatuses.length > 0) {
      const latest = savedStatuses.reduce((a, b) =>
        a.lastSavedAt! > b.lastSavedAt! ? a : b,
      )
      return { status: 'saved', lastSavedAt: latest.lastSavedAt }
    }
    return { status: 'idle' }
  }, [saveStatuses])

  // Real-time total: use local totals when available, fall back to server data (projects + activities)
  const realTimeTotalHours = useMemo(() => {
    let total = 0
    for (const project of projects) {
      const member = project.members[0]
      if (!member) continue
      if (localTotals[member.memberId] !== undefined) {
        total += localTotals[member.memberId]
      } else {
        total += projectHoursMap.get(project.projectId) || 0
      }
    }
    for (const at of myActivityTypes) {
      if (localActivityTotals[at.id] !== undefined) {
        total += localActivityTotals[at.id]
      } else {
        total += activityEntries
          .filter((e) => e.activity_type_id === at.id)
          .reduce((s, e) => s + e.hours, 0)
      }
    }
    return total
  }, [
    projects,
    localTotals,
    projectHoursMap,
    myActivityTypes,
    localActivityTotals,
    activityEntries,
  ])

  // Compute real-time daily totals across all projects + activities using local day hours
  const realTimeDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const day of weekDays) {
      let dayTotal = 0
      for (const project of projects) {
        const member = project.members[0]
        if (!member) continue
        const memberDayHours = localDayHours[member.memberId]
        if (memberDayHours && memberDayHours[day.date] !== undefined) {
          dayTotal += memberDayHours[day.date]
        } else {
          const entry = timesheetEntries.find(
            (e) =>
              e.projectMemberId === member.memberId && e.workDate === day.date,
          )
          dayTotal += entry?.hours ?? 0
        }
      }
      for (const at of myActivityTypes) {
        const atDayHours = localActivityDayHours[at.id]
        if (atDayHours && atDayHours[day.date] !== undefined) {
          dayTotal += atDayHours[day.date]
        } else {
          const entry = activityEntries.find(
            (e) => e.activity_type_id === at.id && e.work_date === day.date,
          )
          dayTotal += entry?.hours ?? 0
        }
      }
      totals[day.date] = dayTotal
    }
    return totals
  }, [
    weekDays,
    projects,
    localDayHours,
    timesheetEntries,
    myActivityTypes,
    localActivityDayHours,
    activityEntries,
  ])

  const allProjectsLocked = useMemo(() => {
    return projects.every((p) => {
      const member = p.members[0]
      if (!member) return false
      const memberEntries = timesheetEntries.filter(
        (e) => e.projectMemberId === member.memberId,
      )
      return memberEntries.length > 0 && memberEntries.every((e) => e.isLocked)
    })
  }, [projects, timesheetEntries])

  const { lockedCount, draftCount } = useMemo(() => {
    let locked = 0
    let draft = 0
    for (const p of projects) {
      const member = p.members[0]
      if (!member) continue
      const memberEntries = timesheetEntries.filter(
        (e) => e.projectMemberId === member.memberId,
      )
      if (memberEntries.length > 0 && memberEntries.every((e) => e.isLocked)) {
        locked++
      } else {
        draft++
      }
    }
    return { lockedCount: locked, draftCount: draft }
  }, [projects, timesheetEntries])

  const showFridayReminder = isFriday && isCurrentWeek && !allProjectsLocked

  const handleSubmitAll = () => {
    const projectsToSubmit = projects.map((p) => ({
      projectId: p.projectId,
      totalHours: projectHoursMap.get(p.projectId) || 0,
      memberIds: p.members.map((m) => m.memberId),
    }))
    submitAllProjects.mutate(
      {
        projects: projectsToSubmit,
        weekStart: startDate,
        weekDays: weekDays.map((d) => d.date),
      },
      {
        onSuccess: () => setShowSubmitAllDialog(false),
      },
    )
  }

  return (
    <AppLayout
      title='Minha Timesheet'
      description='Lance suas horas nos projetos em que você está alocado'
    >
      {isLoading ? (
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      ) : (
        <div className='space-y-4'>
          {/* View mode toggle */}
          <div className='flex gap-1 p-1 bg-muted rounded-lg w-fit'>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('monthly')}
            >
              Meses
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              size='sm'
              onClick={() => setViewMode('weekly')}
            >
              Semanas
            </Button>
          </div>

          {viewMode === 'monthly' ? (
            <div className='space-y-4'>
              <MyTimesheetAllocation
                employeeId={employee?.id}
                monthKey={format(new Date(), 'yyyy-MM')}
              />
              <MonthlyTimesheetView employeeId={employee!.id} />
            </div>
          ) : (
            <>
              <Card>
                <CardContent className='pt-4'>
                  {/* Linha 1: Navegador de mês — largura total */}
                  <div className='px-3 pb-1'>
                    <TimesheetWeekSelector
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      viewMonth={weekSelectorMonth}
                      onViewMonthChange={setWeekSelectorMonth}
                      part='month-nav'
                    />
                  </div>

                  {projects.length === 0 && myActivityTypes.length === 0 ? (
                    <>
                      <div className='px-3 pb-2'>
                        <TimesheetWeekSelector
                          selectedDate={selectedDate}
                          onDateChange={setSelectedDate}
                          viewMonth={weekSelectorMonth}
                          onViewMonthChange={setWeekSelectorMonth}
                          part='chips'
                        />
                      </div>
                      <div className='text-center py-12 text-muted-foreground'>
                        <Building2 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                        <p>
                          Você não está alocado em nenhum projeto ativo nesta
                          semana.
                        </p>
                        <p className='text-sm'>
                          Navegue para outra semana ou aguarde ser incluído em
                          um projeto.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Chips de semana — linha própria, fora do scroll horizontal */}
                      <div className='px-3 pb-2 mt-6 mb-6'>
                        <TimesheetWeekSelector
                          selectedDate={selectedDate}
                          onDateChange={setSelectedDate}
                          viewMonth={weekSelectorMonth}
                          onViewMonthChange={setWeekSelectorMonth}
                          part='chips'
                        />
                      </div>

                      <div className='overflow-x-auto'>
                        <div className='min-w-[520px]'>
                          {/* Cabeçalho dos dias */}
                          <div className='grid grid-cols-[minmax(0,1.5fr)_repeat(5,68px)_72px_90px] gap-2 items-center px-3 pb-1 text-xs font-medium text-muted-foreground'>
                            <div />
                            {weekDays.map((day) => {
                              const holiday = isHoliday(
                                parseISO(day.date),
                                holidays,
                              )
                              const isToday =
                                day.date === format(new Date(), 'yyyy-MM-dd')
                              return (
                                <TooltipProvider key={day.date}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          'text-center rounded-md py-1',
                                          holiday &&
                                            'bg-destructive/10 text-destructive',
                                          isToday &&
                                            !holiday &&
                                            'bg-primary/10 text-primary font-medium',
                                        )}
                                      >
                                        {format(
                                          new Date(day.date + 'T12:00:00'),
                                          'EEE',
                                          { locale: ptBR },
                                        )}
                                        <br />
                                        <span className='text-[10px]'>
                                          {format(
                                            new Date(day.date + 'T12:00:00'),
                                            'dd/MM',
                                            { locale: ptBR },
                                          )}
                                        </span>
                                        {holiday && (
                                          <span className='text-[8px] block'>
                                            *
                                          </span>
                                        )}
                                        {isToday && !holiday && (
                                          <span className='text-[10px] text-primary font-medium block'>
                                            hoje
                                          </span>
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    {holiday && (
                                      <TooltipContent>
                                        <p>{holiday.name}</p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            })}
                            <div className='text-right pr-2'>Total</div>
                            <div className='text-center'>Status</div>
                          </div>

                          {showFridayReminder && (
                            <div className='flex items-start gap-2.5 mx-0 mt-1 mb-1 px-3 py-2.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500'>
                              <AlertCircle className='h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0' />
                              <div className='text-sm text-amber-800 dark:text-amber-200'>
                                <span className='font-medium'>Lembrete:</span>{' '}
                                Envie suas horas até o final do dia. Após o
                                envio, somente seu gerente ou admin poderá fazer
                                alterações.
                              </div>
                            </div>
                          )}

                          {/* Future week info banner */}
                          {isFutureWeek && (
                            <div className='flex items-start gap-2.5 mx-3 mt-2 px-3 py-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500'>
                              <Info className='h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0' />
                              <p className='text-sm text-blue-700 dark:text-blue-300'>
                                Esta semana ainda não começou. Você poderá
                                lançar horas a partir de{' '}
                                {format(weekStart, 'dd/MM/yyyy')}.
                              </p>
                            </div>
                          )}

                          {/* Projetos */}
                          <Collapsible
                            open={projectsOpen}
                            onOpenChange={setProjectsOpen}
                          >
                            <CollapsibleTrigger asChild>
                              <button className='flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/30 rounded-md transition-colors'>
                                <Building2 className='h-4 w-4 text-muted-foreground shrink-0' />
                                <span className='text-sm font-medium text-muted-foreground'>
                                  Projetos
                                </span>
                                <span className='bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5 shrink-0'>
                                  {projects.length}
                                </span>
                                <div className='flex-1 h-px bg-border' />
                                <ChevronRight
                                  className={cn(
                                    'h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0',
                                    projectsOpen && 'rotate-90',
                                  )}
                                />
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              {projects.map((project) => {
                                const member = project.members[0]
                                const memberEntries = timesheetEntries.filter(
                                  (e) => e.projectMemberId === member.memberId,
                                )
                                const isLocked =
                                  memberEntries.length > 0 &&
                                  memberEntries.every((e) => e.isLocked)
                                const actionContent = isLocked ? (
                                  <Badge
                                    variant='secondary'
                                    className='bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 whitespace-nowrap'
                                  >
                                    <CheckCircle2 className='h-3 w-3 mr-1' />
                                    Enviado
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant='secondary'
                                    className='whitespace-nowrap'
                                  >
                                    Rascunho
                                  </Badge>
                                )

                                return (
                                  <TimesheetWeekRow
                                    key={member.memberId}
                                    label={project.projectName}
                                    clientName={project.clientName}
                                    labelExtra={
                                      unplannedProjectIds.has(
                                        project.projectId,
                                      ) ? (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <CircleAlert className='h-3.5 w-3.5 text-amber-500 flex-shrink-0' />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>
                                                Este projeto não possui alocação
                                                planejada para o mês.
                                              </p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      ) : undefined
                                    }
                                    projectId={project.projectId}
                                    memberId={member.memberId}
                                    weekDays={weekDays}
                                    existingEntries={timesheetEntries}
                                    holidays={holidays}
                                    isLocked={isLocked || isFutureWeek}
                                    isAdmin={false}
                                    actionSlot={actionContent}
                                    allDailyTotals={allDailyTotals}
                                    dailyWorkHours={
                                      employee?.jornada_diaria ?? 8
                                    }
                                    onLocalTotalChange={handleLocalTotalChange}
                                    onLocalDayHoursChange={
                                      handleLocalDayHoursChange
                                    }
                                    onSaveStatusChange={handleSaveStatusChange}
                                  />
                                )
                              })}
                            </CollapsibleContent>
                          </Collapsible>

                          {/* Atividades Internas */}
                          {myActivityTypes.length > 0 && (
                            <Collapsible
                              open={activitiesOpen}
                              onOpenChange={setActivitiesOpen}
                            >
                              <CollapsibleTrigger asChild>
                                {projects.length > 0 ? (
                                  /* Separador visual — só aparece quando há projetos E atividades */
                                  <button className='flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/30 rounded-md transition-colors mt-1'>
                                    <Briefcase className='h-4 w-4 text-muted-foreground shrink-0' />
                                    <span className='text-sm font-medium text-muted-foreground'>
                                      Atividades Internas
                                    </span>
                                    <span className='bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5 shrink-0'>
                                      {myActivityTypes.length}
                                    </span>
                                    <div className='flex-1 h-px bg-border' />
                                    <ChevronRight
                                      className={cn(
                                        'h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0',
                                        activitiesOpen && 'rotate-90',
                                      )}
                                    />
                                  </button>
                                ) : (
                                  /* Trigger simples — sem separador quando não há projetos */
                                  <button className='flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-muted/50 rounded-md transition-colors'>
                                    <ChevronRight
                                      className={cn(
                                        'h-3.5 w-3.5 text-muted-foreground transition-transform',
                                        activitiesOpen && 'rotate-90',
                                      )}
                                    />
                                    <span className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>
                                      Atividades internas (
                                      {myActivityTypes.length})
                                    </span>
                                  </button>
                                )}
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div
                                  className={cn(
                                    projects.length > 0 &&
                                      'bg-muted/20 rounded-md',
                                  )}
                                >
                                  {myActivityTypes.map((at) => (
                                    <ActivityTimesheetRow
                                      key={at.id}
                                      activityTypeId={at.id}
                                      activityName={at.name}
                                      employeeId={employee!.id}
                                      weekDays={weekDays}
                                      existingEntries={activityEntries}
                                      holidays={holidays}
                                      allDailyTotals={allDailyTotals}
                                      dailyWorkHours={
                                        employee?.jornada_diaria ?? 8
                                      }
                                      onLocalTotalChange={
                                        handleActivityLocalTotalChange
                                      }
                                      onLocalDayHoursChange={
                                        handleActivityLocalDayHoursChange
                                      }
                                      onSaveStatusChange={
                                        handleSaveStatusChange
                                      }
                                    />
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}

                          {/* Daily totals row */}
                          <div className='grid grid-cols-[minmax(0,1.5fr)_repeat(5,68px)_72px_90px] gap-2 items-center py-2 px-3 border-t bg-muted/50 font-medium'>
                            <div className='text-xs italic text-muted-foreground'>
                              Total/dia
                            </div>
                            {weekDays.map((day) => {
                              const dayTotal =
                                realTimeDailyTotals[day.date] ?? 0
                              const jornada = employee?.jornada_diaria ?? 8
                              const isZero = dayTotal === 0
                              const isOverJornada = dayTotal > jornada
                              const isOverHardLimit = dayTotal > 12

                              return (
                                <TooltipProvider key={day.date}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          'text-center text-xs font-medium tabular-nums',
                                          isZero && 'text-muted-foreground/50',
                                          !isZero &&
                                            !isOverJornada &&
                                            dayTotal === jornada &&
                                            'text-emerald-700 dark:text-emerald-400',
                                          !isZero &&
                                            !isOverJornada &&
                                            dayTotal < jornada &&
                                            'text-muted-foreground',
                                          isOverJornada &&
                                            !isOverHardLimit &&
                                            'text-amber-600 dark:text-amber-400 font-semibold',
                                          isOverHardLimit &&
                                            'text-destructive font-semibold',
                                        )}
                                      >
                                        {dayTotal > 0
                                          ? `${Math.round(dayTotal * 10) / 10}h`
                                          : '—'}
                                      </div>
                                    </TooltipTrigger>
                                    {isOverJornada && (
                                      <TooltipContent>
                                        <p>
                                          Excede a jornada diária de {jornada}h
                                          em{' '}
                                          {Math.round(
                                            (dayTotal - jornada) * 10,
                                          ) / 10}
                                          h
                                        </p>
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            })}
                            <div />
                            <div />
                          </div>
                        </div>
                      </div>

                      {/* Footer de ações */}
                      <div className='flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 border-t bg-background'>
                        <div className='text-xs text-muted-foreground'>
                          Jornada: {employee?.jornada_diaria ?? 8}h/dia ·{' '}
                          {draftCount}{' '}
                          {draftCount === 1
                            ? 'projeto em rascunho'
                            : 'projetos em rascunho'}
                        </div>
                        <div className='flex items-center gap-2'>
                          <GlobalSaveIndicator saveStatuses={saveStatuses} />
                          {!isFutureWeek && (
                            <Button
                              size='sm'
                              onClick={() => setShowSubmitAllDialog(true)}
                              disabled={
                                !allWeekDaysReady ||
                                allProjectsLocked ||
                                submitAllProjects.isPending
                              }
                            >
                              <Send className='h-4 w-4 mr-1.5' />
                              Enviar semana
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {viewMode === 'weekly' && (
        <SubmitAllProjectsDialog
          open={showSubmitAllDialog}
          onOpenChange={setShowSubmitAllDialog}
          pendingCount={projects.length}
          weekStart={weekStart}
          weekEnd={weekEnd}
          totalHours={totalHoursAllProjects}
          onConfirm={handleSubmitAll}
          isSubmitting={submitAllProjects.isPending}
        />
      )}
    </AppLayout>
  )
}

export default MyTimesheet
