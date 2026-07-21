import { useMemo, useState } from 'react';
import { ArrowUpDown, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency, formatShortName } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CONTRACT_TYPE_LABELS } from '@/types/employee';
import type { PayrollAnalysisRow } from '@/lib/payrollAnalysis';
import { EmployeeDetailDialog } from '@/components/employees/EmployeeDetailDialog';

interface CostPerHourTableProps {
  rows: PayrollAnalysisRow[];
  monthLabel: string;
  estimated?: boolean;
  projected?: boolean;
}

type SortKey =
  | 'nome'
  | 'cargo'
  | 'tipo'
  | 'baseAmount'
  | 'chargesAmount'
  | 'benefitsAmount'
  | 'toolsAmount'
  | 'provisionsAmount'
  | 'totalMonthlyCost'
  | 'hoursWorked'
  | 'hourlyCost';
type SortDir = 'asc' | 'desc';

function getSortValue(row: PayrollAnalysisRow, key: SortKey): string | number {
  if (key === 'nome') return row.nome;
  if (key === 'cargo') return row.cargo;
  if (key === 'tipo') return CONTRACT_TYPE_LABELS[row.tipoContratacao];
  return row[key];
}

export function CostPerHourTable({ rows, monthLabel, estimated, projected }: CostPerHourTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('hourlyCost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedRow, setSelectedRow] = useState<PayrollAnalysisRow | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (typeof va === 'string' || typeof vb === 'string') {
        return dir * String(va).localeCompare(String(vb));
      }
      return dir * (va - vb);
    });
  }, [rows, sortKey, sortDir]);

  const SortableHead = ({
    label,
    sortKeyName,
    className,
    align = 'left',
    tooltip,
  }: {
    label: string;
    sortKeyName: SortKey;
    className?: string;
    align?: 'left' | 'right';
    tooltip?: string;
  }) => (
    <TableHead className={className}>
      <div className={cn('flex items-center gap-1', align === 'right' && 'justify-end')}>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded px-1 py-0.5 text-xs hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            align === 'right' ? '-mr-1' : '-ml-1',
          )}
          onClick={() => toggleSort(sortKeyName)}
        >
          {align === 'right' && <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />}
          {label}
          {align === 'left' && <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />}
        </button>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[240px] text-xs">{tooltip}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TableHead>
  );

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por Hora — {monthLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum colaborador ativo em {monthLabel}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({
      baseAmount: acc.baseAmount + r.baseAmount,
      chargesAmount: acc.chargesAmount + r.chargesAmount,
      benefitsAmount: acc.benefitsAmount + r.benefitsAmount,
      toolsAmount: acc.toolsAmount + r.toolsAmount,
      provisionsAmount: acc.provisionsAmount + r.provisionsAmount,
      totalMonthlyCost: acc.totalMonthlyCost + r.totalMonthlyCost,
      hoursWorked: acc.hoursWorked + r.hoursWorked,
    }),
    {
      baseAmount: 0,
      chargesAmount: 0,
      benefitsAmount: 0,
      toolsAmount: 0,
      provisionsAmount: 0,
      totalMonthlyCost: 0,
      hoursWorked: 0,
    },
  );
  // Custo/hora é uma taxa, não um valor que se soma entre colaboradores — o
  // total do rodapé é a média ponderada (custo total ÷ horas totais), não a
  // soma simples das linhas.
  const avgHourlyCost = totals.hoursWorked > 0 ? totals.totalMonthlyCost / totals.hoursWorked : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custo por Hora — {monthLabel}</CardTitle>
        <CardDescription className="text-xs">
          {projected
            ? 'Projeção: mesmo quadro de colaboradores e mesmos valores de hoje, mantidos constantes até este mês.'
            : estimated
              ? 'Estimado: colaboradores ativos no mês (por admissão/desligamento), com salários e taxas de encargos atuais.'
              : 'Clique em um colaborador para ver o detalhamento completo de encargos e provisões.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Colaborador" sortKeyName="nome" />
                <SortableHead label="Cargo" sortKeyName="cargo" />
                <SortableHead label="Tipo" sortKeyName="tipo" />
                <SortableHead label="Salário Base" sortKeyName="baseAmount" className="text-right" align="right" />
                <SortableHead
                  label="Encargos"
                  sortKeyName="chargesAmount"
                  className="text-right"
                  align="right"
                  tooltip="FGTS + INSS Patronal + outros encargos (RAT, Terceiros, Outros) sobre o salário do mês. Não inclui encargos sobre as provisões de 13º/férias — esses ficam em Provisões."
                />
                <SortableHead label="Benefícios" sortKeyName="benefitsAmount" className="text-right" align="right" />
                <SortableHead label="Ferramentas" sortKeyName="toolsAmount" className="text-right" align="right" />
                <SortableHead label="Provisões" sortKeyName="provisionsAmount" className="text-right" align="right" />
                <SortableHead label="Total Mensal" sortKeyName="totalMonthlyCost" className="text-right" align="right" />
                <SortableHead
                  label="Horas no Mês"
                  sortKeyName="hoursWorked"
                  className="text-right"
                  align="right"
                  tooltip="Dias úteis do mês × jornada diária do colaborador, já considerando admissão/desligamento parcial."
                />
                <SortableHead
                  label="Custo/Hora"
                  sortKeyName="hourlyCost"
                  className="text-right"
                  align="right"
                  tooltip="Custo total do colaborador no mês ÷ horas úteis que ele trabalha no mês (jornada diária × dias úteis), já considerando admissão/desligamento parcial."
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={row.employeeId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedRow(row)}
                >
                  <TableCell className="font-medium">{formatShortName(row.nome)}</TableCell>
                  <TableCell className="text-muted-foreground">{row.cargo}</TableCell>
                  <TableCell className="text-muted-foreground">{CONTRACT_TYPE_LABELS[row.tipoContratacao]}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.baseAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.chargesAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.benefitsAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.toolsAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.provisionsAmount)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(row.totalMonthlyCost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.hoursWorked.toFixed(1)}h</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(row.hourlyCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-muted/50">
                <TableCell colSpan={3} className="font-bold">Total ({rows.length} colaboradores)</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.baseAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.chargesAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.benefitsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.toolsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.provisionsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.totalMonthlyCost)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{totals.hoursWorked.toFixed(1)}h</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(avgHourlyCost)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
      <EmployeeDetailDialog
        open={selectedRow != null}
        onOpenChange={(open) => !open && setSelectedRow(null)}
        row={selectedRow}
        monthLabel={monthLabel}
      />
    </Card>
  );
}
