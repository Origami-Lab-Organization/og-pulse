import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CONTRACT_TYPE_LABELS } from '@/types/employee';
import type { PayrollAnalysisRow } from '@/lib/payrollAnalysis';

interface PayrollAnalysisTableProps {
  rows: PayrollAnalysisRow[];
  monthLabel: string;
  estimated?: boolean;
  projected?: boolean;
}

type SortKey =
  | 'nome'
  | 'tipo'
  | 'baseAmount'
  | 'fgtsAmount'
  | 'inssFuncionario'
  | 'benefitsAmount'
  | 'toolsAmount'
  | 'provisionsAmount'
  | 'totalMonthlyCost';
type SortDir = 'asc' | 'desc';

function getSortValue(row: PayrollAnalysisRow, key: SortKey): string | number {
  if (key === 'nome') return row.nome;
  if (key === 'tipo') return CONTRACT_TYPE_LABELS[row.tipoContratacao];
  return row[key];
}

export function PayrollAnalysisTable({ rows, monthLabel, estimated, projected }: PayrollAnalysisTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('totalMonthlyCost');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

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
          <CardTitle className="text-base">Custos por Colaborador — {monthLabel}</CardTitle>
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
      fgtsAmount: acc.fgtsAmount + r.fgtsAmount,
      inssFuncionario: acc.inssFuncionario + r.inssFuncionario,
      benefitsAmount: acc.benefitsAmount + r.benefitsAmount,
      toolsAmount: acc.toolsAmount + r.toolsAmount,
      provisionsAmount: acc.provisionsAmount + r.provisionsAmount,
      totalMonthlyCost: acc.totalMonthlyCost + r.totalMonthlyCost,
    }),
    {
      baseAmount: 0,
      fgtsAmount: 0,
      inssFuncionario: 0,
      benefitsAmount: 0,
      toolsAmount: 0,
      provisionsAmount: 0,
      totalMonthlyCost: 0,
    },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custos por Colaborador — {monthLabel}</CardTitle>
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
                <SortableHead label="Tipo" sortKeyName="tipo" />
                <SortableHead label="Salário Base" sortKeyName="baseAmount" className="text-right" align="right" />
                <SortableHead label="FGTS" sortKeyName="fgtsAmount" className="text-right" align="right" />
                <SortableHead
                  label="INSS"
                  sortKeyName="inssFuncionario"
                  className="text-right"
                  align="right"
                  tooltip="Retido do salário do funcionário e repassado por ele ao INSS — não é um custo adicional da empresa, por isso não soma ao Total Mensal (já incluído no Salário Base)."
                />
                <SortableHead label="Benefícios" sortKeyName="benefitsAmount" className="text-right" align="right" />
                <SortableHead label="Ferramentas" sortKeyName="toolsAmount" className="text-right" align="right" />
                <SortableHead label="Provisões" sortKeyName="provisionsAmount" className="text-right" align="right" />
                <SortableHead label="Total Mensal" sortKeyName="totalMonthlyCost" className="text-right" align="right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map((row) => (
                <TableRow
                  key={row.employeeId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/employees/${row.employeeId}`)}
                >
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{CONTRACT_TYPE_LABELS[row.tipoContratacao]}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.baseAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.fgtsAmount)}</TableCell>
                  <TableCell className="text-right italic tabular-nums text-muted-foreground">
                    {formatCurrency(row.inssFuncionario)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.benefitsAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.toolsAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.provisionsAmount)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(row.totalMonthlyCost)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-muted/50">
                <TableCell colSpan={2} className="font-bold">Total ({rows.length} colaboradores)</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.baseAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.fgtsAmount)}</TableCell>
                <TableCell className="text-right italic font-bold tabular-nums text-muted-foreground">
                  {formatCurrency(totals.inssFuncionario)}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.benefitsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.toolsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.provisionsAmount)}</TableCell>
                <TableCell className="text-right font-bold tabular-nums">{formatCurrency(totals.totalMonthlyCost)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
