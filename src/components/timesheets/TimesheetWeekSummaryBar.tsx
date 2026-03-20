interface TimesheetWeekSummaryBarProps {
  totalWeekHours: number;
  projectCount: number;
  activityCount: number;
  draftCount: number;
  lockedCount: number;
  monthlyActualHours?: number;
  monthlyPlannedHours?: number;
  monthlyCapacity?: number;
  monthlyExpectedHours?: number;
  monthLabel: string;
}

export function TimesheetWeekSummaryBar({
  totalWeekHours,
  projectCount,
  activityCount,
  draftCount,
  lockedCount,
  monthlyActualHours,
  monthlyPlannedHours,
  monthlyCapacity,
  monthlyExpectedHours,
  monthLabel,
}: TimesheetWeekSummaryBarProps) {
  const hasMonthlyData =
    monthlyActualHours !== undefined &&
    monthlyCapacity !== undefined;

  const percent =
    hasMonthlyData && monthlyCapacity! > 0
      ? Math.min(100, (monthlyActualHours! / monthlyCapacity!) * 100)
      : 0;

  return (
    <div className={`bg-muted/30 border-b px-3 py-2.5 grid gap-0 items-start ${hasMonthlyData ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {/* Seção esquerda: Esta semana */}
      <div className={hasMonthlyData ? 'pr-4 border-r' : ''}>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Esta semana
        </p>
        <p className="text-sm font-medium mt-0.5">
          {totalWeekHours.toFixed(1)}h lançadas
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {projectCount} projetos · {activityCount} atividades · {draftCount} rascunhos
        </p>
      </div>

      {/* Seção direita: Contexto mensal */}
      {hasMonthlyData && (
        <div className="pl-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {monthLabel}
          </p>
          <p className="text-sm font-medium mt-0.5">
            {monthlyActualHours!.toFixed(1)}h / {monthlyCapacity!.toFixed(0)}h capacidade
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {percent.toFixed(0)}% realizado
            {monthlyPlannedHours !== undefined && ` · ${monthlyPlannedHours.toFixed(1)}h planejadas`}
            {monthlyExpectedHours !== undefined && ` · ${monthlyExpectedHours.toFixed(1)}h esperadas até hoje`}
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-green-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
