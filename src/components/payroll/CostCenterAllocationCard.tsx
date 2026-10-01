import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCurrency } from '@/lib/formatters';
import { ALLOCATION_CSV_HEADERS, allocationCsvRows, columnsOf, columnTotal } from '@/lib/rateioCentroCusto';
import { downloadCsv } from '@/lib/timeTrackingCsvExport';
import { AllocationLineKind } from '@/types/rateio';
import type { PersonAllocation } from '@/types/rateio';

/**
 * Consolidado do rateio do mês: pessoa × centro, com o total de cada centro. É o que o
 * administrativo lança — e o CSV sai no formato pessoa × centro × valor.
 */

interface Props {
  allocations: PersonAllocation[];
  isLoading: boolean;
  error: unknown;
  monthKey: string | undefined;
  monthLabel: string;
  onRetry: () => void;
}

function Matrix({ allocations }: { allocations: PersonAllocation[] }) {
  const columns = useMemo(() => columnsOf(allocations), [allocations]);
  const grand = allocations.reduce((s, a) => s + a.total, 0);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card">Colaborador</TableHead>
            {columns.map((c) => (
              <TableHead key={c.key} className={c.kind === AllocationLineKind.NotLogged ? 'text-right text-warning-emphasis' : 'text-right'}>
                {c.label}
              </TableHead>
            ))}
            <TableHead className="text-right">Total Mensal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allocations.map((a) => (
            <TableRow key={a.employeeId}>
              <TableCell className="sticky left-0 bg-card font-medium">{a.nome}</TableCell>
              {columns.map((c) => {
                const value = a.lines.find((l) => l.key === c.key)?.value;
                return (
                  <TableCell key={c.key} className="whitespace-nowrap text-right tabular-nums">
                    {value ? formatCurrency(value) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                );
              })}
              <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(a.total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="sticky left-0 bg-muted font-semibold">Total</TableCell>
            {columns.map((c) => (
              <TableCell key={c.key} className="whitespace-nowrap text-right font-semibold tabular-nums">
                {formatCurrency(columnTotal(allocations, c.key))}
              </TableCell>
            ))}
            <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(grand)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export function CostCenterAllocationCard(props: Props) {
  const { allocations, isLoading, error, monthKey, monthLabel, onRetry } = props;
  const exportCsv = () => downloadCsv(`rateio-centro-de-custo-${monthKey ?? ''}.csv`, ALLOCATION_CSV_HEADERS, allocationCsvRows(allocations));
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Rateio por centro de custo{monthLabel ? ` — ${monthLabel}` : ''}</CardTitle>
          <CardDescription>
            Cada centro recebe as horas lançadas nele × o custo-hora do mês. A coluna "Não lançado" é a jornada que não virou
            lançamento — não vai para centro nenhum até alguém decidir. Quem não lança hora vai inteiro para o centro de lotação.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={allocations.length === 0}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Exportar CSV
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
            <p>{mensagemParaUsuario(error, 'Não foi possível calcular o rateio do mês.')}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Tentar de novo
            </Button>
          </div>
        ) : allocations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Ninguém com custo neste mês.</p>
        ) : (
          <Matrix allocations={allocations} />
        )}
      </CardContent>
    </Card>
  );
}
