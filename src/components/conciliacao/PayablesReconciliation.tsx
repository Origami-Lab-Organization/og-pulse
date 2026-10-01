import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCostByCostCenter } from '@/hooks/useCostByCostCenter';
import { useCostCenters } from '@/hooks/useCostCenters';
import { usePayablesByCategory, usePayablesByCostCenter } from '@/hooks/useConciliacao';
import { compareByCostCenter, totals } from '@/lib/conciliacaoPagar';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCurrency } from '@/lib/formatters';
import { CostComparisonKind } from '@/types/conciliacao';
import type { CostComparisonRow, PayablesByCategoryRow } from '@/types/conciliacao';
import type { PeriodRange } from '@/lib/financeiroPeriodo';

/**
 * Contas a pagar (ADR-0044, parte 4): por centro de custo, o custo de pessoas do Pulse ao lado do
 * pago no Conta Azul; e, por categoria, para onde foi o dinheiro. Despesa traz folha: só Admin.
 */

const TOP_CATEGORIES = 15;

const money = (value: number | null) => (value == null ? '—' : formatCurrency(value));

function KindBadge({ kind }: { kind: CostComparisonKind }) {
  if (kind === CostComparisonKind.Unlinked) return <Badge variant="warning">Sem ligação</Badge>;
  if (kind === CostComparisonKind.NoCenterContaAzul || kind === CostComparisonKind.NoCenterPulse) {
    return <Badge variant="neutral">Sem centro</Badge>;
  }
  return null;
}

function DiffCell({ row }: { row: CostComparisonRow }) {
  if (row.pulseCost == null || row.paid == null) return <span className="text-muted-foreground">—</span>;
  const diff = row.paid - row.pulseCost;
  return <span className="tabular-nums">{diff > 0 ? '+' : ''}{formatCurrency(diff)}</span>;
}

function CostCentersTable({ rows }: { rows: CostComparisonRow[] }) {
  const sum = totals(rows);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Centro de custo</TableHead>
            <TableHead className="text-right">Custo de pessoas no Pulse</TableHead>
            <TableHead className="text-right">Pago no Conta Azul</TableHead>
            <TableHead className="text-right">Pago − Pulse</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{row.label}</span>
                  <KindBadge kind={row.kind} />
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{money(row.pulseCost)}</TableCell>
              <TableCell className="text-right tabular-nums">{money(row.paid)}</TableCell>
              <TableCell className="text-right">
                <DiffCell row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">Total</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sum.pulseCost)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sum.paid)}</TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(sum.paid - sum.pulseCost)}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function CategoriesTable({ rows }: { rows: PayablesByCategoryRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const top = rows.slice(0, TOP_CATEGORIES);
  const rest = rows.slice(TOP_CATEGORIES).reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria no Conta Azul</TableHead>
            <TableHead className="text-right">Pago</TableHead>
            <TableHead className="text-right">Do total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {top.map((row) => (
            <TableRow key={row.category}>
              <TableCell className="text-foreground">{row.category}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(Number(row.amount))}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {total > 0 ? `${((Number(row.amount) / total) * 100).toFixed(1)}%` : '—'}
              </TableCell>
            </TableRow>
          ))}
          {rest > 0 && (
            <TableRow>
              <TableCell className="text-muted-foreground">Demais categorias</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(rest)}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">{((rest / total) * 100).toFixed(1)}%</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function LoadError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
      <p>{mensagemParaUsuario(error, 'Não foi possível carregar as contas a pagar.')}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        Tentar de novo
      </Button>
    </div>
  );
}

function CostCentersCard({ range }: { range: PeriodRange }) {
  const paid = usePayablesByCostCenter(range.from, range.to);
  const pulse = useCostByCostCenter({ startDate: range.startDate, endDate: range.endDate });
  const { data: centers = [] } = useCostCenters();
  const rows = useMemo(
    () => compareByCostCenter(pulse.data?.rows ?? [], paid.data ?? [], centers),
    [pulse.data, paid.data, centers],
  );
  const hasUnlinked = rows.some((r) => r.kind === CostComparisonKind.Unlinked);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Por centro de custo</CardTitle>
        <CardDescription>
          Não é a mesma conta: o Pulse estima o custo de pessoas (horas × custo-hora); o Conta Azul tem tudo o que foi pago e
          rateado para o centro — folha, impostos, fornecedores, aluguel. A diferença é o que o Pulse não enxerga.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasUnlinked && (
          <Alert variant="info">
            <Info className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>
              Há centros do Conta Azul sem ligação com um centro do Pulse.{' '}
              <Link to="/admin/integracoes" className="font-medium underline underline-offset-4">
                Ligue em Integrações
              </Link>{' '}
              para o pago entrar na comparação.
            </AlertDescription>
          </Alert>
        )}
        {paid.isError || pulse.isError ? (
          <LoadError error={paid.error ?? pulse.error} retry={() => { paid.refetch(); pulse.refetch(); }} />
        ) : paid.isLoading || pulse.isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <CostCentersTable rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesCard({ range }: { range: PeriodRange }) {
  const { data: rows = [], isLoading, isError, error, refetch } = usePayablesByCategory(range.from, range.to);
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Para onde foi o dinheiro</CardTitle>
        <CardDescription>Contas a pagar do período por categoria do Conta Azul, pelo mês de competência.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <LoadError error={error} retry={() => refetch()} />
        ) : isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta a pagar no período.</p>
        ) : (
          <CategoriesTable rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}

export function PayablesReconciliation({ range }: { range: PeriodRange }) {
  return (
    <div className="space-y-6">
      <CostCentersCard range={range} />
      <CategoriesCard range={range} />
    </div>
  );
}
