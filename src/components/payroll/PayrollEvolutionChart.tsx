import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { PayrollMonthPoint } from '@/lib/payrollHistory';

interface PayrollEvolutionChartProps {
  history: PayrollMonthPoint[];
  selectedMonth: string | undefined;
  onSelectMonth: (month: string) => void;
}

// Ordem fixa de categorias — mesma ordem em barras, legenda e tooltip (fonte
// única, os dois derivam daqui). Cores = tokens --chart-1..6 do tema já
// implementado (src/index.css); --chart-6 é o tom reservado para um 6º item
// categórico ("usar por último").
//
// INSS aqui é sempre o retido do colaborador (não o patronal, que soma em
// Encargos e é sempre 0 no Simples Nacional). FGTS substitui "Encargos
// (Impostos)" como segmento — para quem está no Simples Nacional os dois
// valores são idênticos (INSS patronal/RAT/Terceiros/Outros = 0 no perfil
// padrão); em outro regime tributário, essa parcela residual não aparece
// como segmento aqui (fica só na tabela e no Excel, que mostram o
// detalhamento completo de Encargos).
const CATEGORIES: { key: keyof PayrollMonthPoint; name: string; color: string }[] = [
  { key: 'baseAmount', name: 'Salário Base', color: 'hsl(var(--chart-1))' },
  { key: 'fgtsAmount', name: 'FGTS', color: 'hsl(var(--chart-2))' },
  { key: 'inssFuncionarioAmount', name: 'INSS', color: 'hsl(var(--chart-6))' },
  { key: 'benefitsAmount', name: 'Benefícios', color: 'hsl(var(--chart-4))' },
  { key: 'toolsAmount', name: 'Ferramentas', color: 'hsl(var(--chart-5))' },
  { key: 'provisionsAmount', name: 'Provisões', color: 'hsl(var(--chart-3))' },
];

interface EvolutionTooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
  dataKey: string;
}

function EvolutionTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: EvolutionTooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = (payload[0] as unknown as { payload: PayrollMonthPoint })?.payload;
  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="min-w-[220px] rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-medium">
        {label}
        {point?.estimated && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(estimado)</span>}
        {point?.projected && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(projeção)</span>}
      </p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="tabular-nums font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3 border-t pt-1.5 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatCurrency(total)}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{point?.headcount} colaborador{point?.headcount === 1 ? '' : 'es'}</p>
    </div>
  );
}

export function PayrollEvolutionChart({ history, selectedMonth, onSelectMonth }: PayrollEvolutionChartProps) {
  const hasData = history.some((h) => h.totalMonthlyCost > 0);
  const year = history[0]?.key.slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução da Folha{year ? ` — ${year}` : ''}</CardTitle>
        <CardDescription className="text-xs">
          Clique em um mês para ver o detalhamento por colaborador · meses em cinza claro são projeção (quadro e
          valores de hoje mantidos constantes)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">Sem dados de folha no período.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={history} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} className="capitalize" />
              <YAxis
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<EvolutionTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {CATEGORIES.map((cat, catIndex) => (
                <Bar
                  key={cat.key}
                  dataKey={cat.key}
                  name={cat.name}
                  stackId="cost"
                  fill={cat.color}
                  radius={catIndex === CATEGORIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  onClick={(data: PayrollMonthPoint) => onSelectMonth(data.key)}
                  className="cursor-pointer"
                >
                  {history.map((entry) => {
                    const isSelected = entry.key === selectedMonth;
                    const fillOpacity = isSelected ? 1 : entry.projected ? 0.25 : 0.45;
                    return <Cell key={entry.key} fillOpacity={fillOpacity} />;
                  })}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
