import { useState, useMemo } from 'react'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'

export type AnalyticsPreset =
  | 'this_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'this_year'
  | 'custom'

export interface CarteiraFilters {
  readonly startDate: Date
  readonly endDate: Date
  readonly preset: AnalyticsPreset
  readonly gpFilter: string | null
}

function presetToRange(
  preset: AnalyticsPreset,
  customStart?: Date,
  customEnd?: Date,
): { startDate: Date; endDate: Date } {
  const today = new Date()
  switch (preset) {
    case 'this_month':
      return { startDate: startOfMonth(today), endDate: endOfMonth(today) }
    case 'last_3_months':
      return { startDate: startOfMonth(subMonths(today, 2)), endDate: endOfMonth(today) }
    case 'last_6_months':
      return { startDate: startOfMonth(subMonths(today, 5)), endDate: endOfMonth(today) }
    case 'this_year':
      return { startDate: startOfYear(today), endDate: endOfYear(today) }
    case 'custom':
      return {
        startDate: customStart ?? startOfMonth(today),
        endDate: customEnd ?? endOfMonth(today),
      }
  }
}

export function useAnalyticsFilters() {
  const { employee } = useAuth()
  const isAdmin = employee?.isAdmin ?? false

  const [preset, setPresetState] = useState<AnalyticsPreset>('last_3_months')
  const [customStart, setCustomStart] = useState<Date | undefined>()
  const [customEnd, setCustomEnd] = useState<Date | undefined>()
  const [gpFilter, setGpFilterState] = useState<string | null>(null)

  const range = useMemo(
    () => presetToRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const filters: CarteiraFilters = useMemo(
    () => ({ ...range, preset, gpFilter }),
    [range, preset, gpFilter],
  )

  function setPreset(p: AnalyticsPreset) {
    setPresetState(p)
  }

  function setCustomRange(start: Date, end: Date) {
    setCustomStart(start)
    setCustomEnd(end)
    setPresetState('custom')
  }

  function setGpFilter(gpId: string | null) {
    if (!isAdmin) return
    setGpFilterState(gpId)
  }

  return {
    filters,
    setPreset,
    setCustomRange,
    setGpFilter,
    customStart,
    customEnd,
    isAdmin,
  }
}
