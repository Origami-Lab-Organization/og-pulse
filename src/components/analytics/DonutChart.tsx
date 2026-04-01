import { useMemo } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatCurrency, formatPercent } from '@/lib/formatters'

export interface DonutItem {
  label: string
  value: number
}

interface Props {
  data: DonutItem[]
  title: string
  emptyLabel?: string
  naked?: boolean
}

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(152, 55%, 40%)',
  'hsl(38, 85%, 52%)',
  'hsl(280, 55%, 55%)',
  'hsl(0, 70%, 58%)',
  'hsl(195, 70%, 45%)',
  'hsl(30, 80%, 50%)',
  'hsl(340, 65%, 50%)',
]

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  return (
    <div className="grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: entry.payload.fill }}
        />
        <div className="flex flex-1 justify-between gap-4">
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-mono font-medium tabular-nums">
            {formatCurrency(entry.value)}
          </span>
        </div>
      </div>
    </div>
  )
}

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {formatPercent(percent * 100)}
    </text>
  )
}

export function DonutChart({ data, title, emptyLabel = 'Sem dados no período.', naked = false }: Props) {
  const items = useMemo(
    () =>
      data
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
        .map((d, i) => ({ name: d.label, value: d.value, fill: COLORS[i % COLORS.length] })),
    [data],
  )

  const total = useMemo(() => items.reduce((s, i) => s + i.value, 0), [items])

  const chartConfig = useMemo(
    () =>
      items.reduce((acc, item) => {
        acc[item.name] = { label: item.name, color: item.fill }
        return acc
      }, {} as ChartConfig),
    [items],
  )

  if (items.length === 0) {
    const empty = (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyLabel}</p>
    )
    if (naked) return empty
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>{empty}</CardContent>
      </Card>
    )
  }

  const chartContent = (
    <ChartContainer config={chartConfig} className="h-[200px] w-full">
      <PieChart>
        <Pie
          data={items}
          cx="50%"
          cy="50%"
          innerRadius="45%"
          outerRadius="72%"
          paddingAngle={2}
          dataKey="value"
          labelLine={false}
          label={SliceLabel}
        >
          {items.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} />
          ))}
        </Pie>
        <ChartTooltip content={<DonutTooltip />} />
      </PieChart>
    </ChartContainer>
  )

  const legendContent = (
    <div className="mt-2 grid grid-cols-1 gap-1">
      {items.map((item, i) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0
        return (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate text-muted-foreground">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span className="text-muted-foreground">{formatPercent(pct)}</span>
              <span className="font-medium">{formatCurrency(item.value)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (naked) {
    return (
      <>
        {chartContent}
        {legendContent}
      </>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartContent}
        {legendContent}
      </CardContent>
    </Card>
  )
}
