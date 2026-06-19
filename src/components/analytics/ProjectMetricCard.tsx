import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MetricStatusColor = 'default' | 'red' | 'amber' | 'green'

export interface ProjectMetricCardProps {
  label: string
  value: string
  subtitle?: string
  tooltip?: string
  isLoading?: boolean
  statusColor?: MetricStatusColor
  delta?: string
  deltaPositive?: boolean
  variant?: 'value' | 'count'
}

const DOT_COLOR: Partial<Record<MetricStatusColor, string>> = {
  red:   'bg-red-500',
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
}

const VALUE_COLOR: Record<MetricStatusColor, string> = {
  default: 'text-foreground',
  green:   'text-emerald-600 dark:text-emerald-400',
  amber:   'text-amber-600 dark:text-amber-400',
  red:     'text-red-600 dark:text-red-400',
}

export function ProjectMetricCard({
  label,
  value,
  subtitle,
  tooltip,
  isLoading = false,
  statusColor = 'default',
  delta,
  deltaPositive,
}: ProjectMetricCardProps) {
  const dotClass = DOT_COLOR[statusColor]
  const valueClass = VALUE_COLOR[statusColor]
  const deltaClass =
    deltaPositive === true  ? 'text-emerald-600 dark:text-emerald-400' :
    deltaPositive === false ? 'text-red-600 dark:text-red-400' :
                              'text-muted-foreground'

  return (
    <div className="flex-1 min-w-0 px-5 py-4">
      {/* Label + dot + tooltip */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {dotClass && <span className={cn('h-2 w-2 rounded-full', dotClass)} />}
          {tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Value */}
      {isLoading ? (
        <Skeleton className="h-7 w-20 mb-1.5" />
      ) : (
        <div className={cn('text-2xl font-bold leading-tight', valueClass)}>{value}</div>
      )}

      {/* Delta */}
      {!isLoading && delta && (
        <div className={cn('mt-0.5 text-xs font-medium', deltaClass)}>{delta}</div>
      )}

      {/* Subtitle */}
      {!isLoading && subtitle && (
        <div className={cn('text-xs text-muted-foreground', delta ? '' : 'mt-0.5')}>{subtitle}</div>
      )}
    </div>
  )
}
