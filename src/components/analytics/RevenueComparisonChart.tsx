import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
} from '@/components/ui/chart'
import { formatCurrency } from '@/lib/formatters'
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution'

interface Props {
  data: FinancialMonthlyPoint[]
  year: number
}

const chartConfig = {
  revenuePlanned: { label: 'Previsto', color: 'hsl(220, 15%, 70%)' },
  faturado: { label: 'NF Emitida', color: 'hsl(152, 55%, 35%)' },
  revenueReal: { label: 'Receita Recebida', color: 'hsl(220, 70%, 50%)' },
} satisfies ChartConfig

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="grid min-w-[10rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium capitalize">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((p: any) => {
          const cfg = chartConfig[p.dataKey as keyof typeof chartConfig]
          return (
            <div key={p.dataKey} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: p.color }}
              />
              <div className="flex flex-1 justify-between gap-4">
                <span className="text-muted-foreground">{cfg?.label ?? p.name}</span>
                <span className="font-mono font-medium tabular-nums">
                  {formatCurrency(Number(p.value))}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RevenueComparisonChart({ data, year }: Props) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          NF &amp; Receita: Previsto vs Realizado — {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <BarChart
            data={data}
            barCategoryGap="20%"
            barGap={2}
            margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <ChartTooltip content={<RevenueTooltip />} />
            <ChartLegend content={<ChartLegendContent />} />

            <Bar
              dataKey="revenuePlanned"
              fill="var(--color-revenuePlanned)"
              radius={[3, 3, 0, 0]}
              barSize={8}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill="var(--color-revenuePlanned)"
                  fillOpacity={d.isHighlighted ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="faturado"
              fill="var(--color-faturado)"
              radius={[3, 3, 0, 0]}
              barSize={8}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill="var(--color-faturado)"
                  fillOpacity={d.isHighlighted ? 1 : 0.35}
                />
              ))}
            </Bar>
            <Bar
              dataKey="revenueReal"
              fill="var(--color-revenueReal)"
              radius={[3, 3, 0, 0]}
              barSize={8}
            >
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill="var(--color-revenueReal)"
                  fillOpacity={d.isHighlighted ? 1 : 0.35}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
