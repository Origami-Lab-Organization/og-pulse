import { useState, useMemo } from 'react'
import type { DimensionFinancialRow } from './useProjectFinancials'

export type ServiceLineSortKey = 'margemPct' | 'receita' | 'nome'
export type SortDirection = 'asc' | 'desc'

export interface ServiceLineSort {
  readonly key: ServiceLineSortKey
  readonly direction: SortDirection
}

export function useServiceLineSort(rows: readonly DimensionFinancialRow[]) {
  const [sort, setSort] = useState<ServiceLineSort>({ key: 'margemPct', direction: 'desc' })

  function toggleSort(key: ServiceLineSortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'nome' ? 'asc' : 'desc' }
    )
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0
      if (sort.key === 'nome') {
        cmp = a.label.localeCompare(b.label, 'pt-BR')
      } else if (sort.key === 'receita') {
        cmp = a.revenue - b.revenue
      } else {
        const ma = a.grossMargin ?? -Infinity
        const mb = b.grossMargin ?? -Infinity
        cmp = ma !== mb ? ma - mb : a.revenue - b.revenue
      }
      return sort.direction === 'asc' ? cmp : -cmp
    })
  }, [rows, sort])

  return { sort, toggleSort, sorted }
}
