import { Fragment, useMemo, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCurrency } from '@/lib/formatters';
import { ALLOCATION_CSV_HEADERS, allocationCsvRows, allocationTotals, groupByCenter } from '@/lib/rateioCentroCusto';
import { formatHours } from '@/lib/relatorioHoras';
import { downloadCsv } from '@/lib/timeTrackingCsvExport';
import { cn } from '@/lib/utils';
import { AllocationLineKind } from '@/types/rateio';
import type { CenterGroup, PersonAllocation } from '@/types/rateio';

/**
 * Consolidado do rateio do mês. Por centro (padrão): uma linha por centro, que é o que o
 * administrativo lança, e as pessoas abrem por baixo. Por pessoa: os centros de cada um em uma
 * linha. O CSV sai pessoa × centro × valor.
 */

enum View {
  ByCenter = 'centro',
  ByPerson = 'pessoa',
}

interface Props {
  allocations: PersonAllocation[];
  isLoading: boolean;
  error: unknown;
  monthKey: string | undefined;
  monthLabel: string;
  onRetry: () => void;
}

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const isNotLogged = (kind: AllocationLineKind) => kind === AllocationLineKind.NotLogged;

function Summary({ allocations }: { allocations: PersonAllocation[] }) {
  const { total, notLogged } = allocationTotals(allocations);
  const allocated = Math.round((total - notLogged) * 100) / 100;
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-border p-3">
        <dt className="text-sm text-muted-foreground">Custo do mês</dt>
        <dd className="text-xl font-semibold tabular-nums text-foreground">{formatCurrency(total)}</dd>
      </div>
      <div className="rounded-lg border border-border p-3">
        <dt className="text-sm text-muted-foreground">Rateado em centros</dt>
        <dd className="text-xl font-semibold tabular-nums text-foreground">
          {formatCurrency(allocated)} <span className="text-sm font-normal text-muted-foreground">{pct(allocated, total).toFixed(0)}%</span>
        </dd>
      </div>
      <div className="rounded-lg border border-border p-3">
        <dt className="text-sm text-muted-foreground">Não lançado</dt>
        <dd className="text-xl font-semibold tabular-nums text-warning-emphasis">
          {formatCurrency(notLogged)} <span className="text-sm font-normal text-muted-foreground">{pct(notLogged, total).toFixed(0)}%</span>
        </dd>
      </div>
    </dl>
  );
}

function CenterRow(props: { group: CenterGroup; total: number; open: boolean; onToggle: () => void }) {
  const { group, total, open, onToggle } = props;
  const share = pct(group.value, total);
  return (
    <Fragment>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-sm text-left font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRight className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} aria-hidden="true" />
            <span className={cn('[overflow-wrap:anywhere]', isNotLogged(group.kind) && 'text-warning-emphasis')}>{group.label}</span>
          </button>
        </TableCell>
        <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">{group.people.length}</TableCell>
        <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">{formatHours(group.hours)}</TableCell>
        <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
          {formatCurrency(group.value)}
          <span className="block text-xs font-normal text-muted-foreground sm:hidden">{share.toFixed(0)}% do mês</span>
        </TableCell>
        <TableCell className="hidden w-40 sm:table-cell">
          <div className="flex items-center gap-2">
            <Progress
              value={share}
              className={cn('h-2', isNotLogged(group.kind) && '[&>div]:bg-warning')}
              aria-label={`${share.toFixed(0)}% do custo do mês`}
            />
            <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{share.toFixed(0)}%</span>
          </div>
        </TableCell>
      </TableRow>
      {open &&
        group.people.map((p) => (
          <TableRow key={`${group.key}-${p.employeeId}`} className="bg-muted/40 hover:bg-muted/40">
            <TableCell className="pl-6 text-sm text-foreground sm:pl-10">
              {p.nome}
              {p.byLotacao && (
                <Badge variant="neutral" className="ml-2">
                  lotação
                </Badge>
              )}
            </TableCell>
            <TableCell className="hidden md:table-cell" />
            <TableCell className="hidden text-right text-sm tabular-nums text-muted-foreground sm:table-cell">{formatHours(p.hours)}</TableCell>
            <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">
              {formatCurrency(p.value)}
              <span className="block text-xs text-muted-foreground sm:hidden">{(p.shareOfPerson * 100).toFixed(0)}% da pessoa</span>
            </TableCell>
            <TableCell className="hidden whitespace-nowrap text-right text-sm tabular-nums text-muted-foreground sm:table-cell">
              {(p.shareOfPerson * 100).toFixed(0)}% da pessoa
            </TableCell>
          </TableRow>
        ))}
    </Fragment>
  );
}

function ByCenterTable({ allocations }: { allocations: PersonAllocation[] }) {
  const groups = useMemo(() => groupByCenter(allocations), [allocations]);
  const { total } = allocationTotals(allocations);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Centro de custo</TableHead>
          <TableHead className="hidden text-right md:table-cell">Pessoas</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Horas</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead className="hidden sm:table-cell">Do custo do mês</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <CenterRow key={group.key} group={group} total={total} open={open.has(group.key)} onToggle={() => toggle(group.key)} />
        ))}
      </TableBody>
    </Table>
  );
}

function PersonCenters({ allocation }: { allocation: PersonAllocation }) {
  return (
    <p className="text-sm text-muted-foreground">
      {allocation.lines.map((l, i) => (
        <span key={l.key}>
          {i > 0 && ' · '}
          <span className={isNotLogged(l.kind) ? 'text-warning-emphasis' : 'text-foreground'}>{l.label}</span>{' '}
          <span className="tabular-nums">{(l.share * 100).toFixed(0)}%</span>
        </span>
      ))}
    </p>
  );
}

function ByPersonTable({ allocations }: { allocations: PersonAllocation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Colaborador</TableHead>
          <TableHead>Para onde foi</TableHead>
          <TableHead className="text-right">Total Mensal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {allocations.map((a) => (
          <TableRow key={a.employeeId}>
            <TableCell className="whitespace-nowrap font-medium">{a.nome}</TableCell>
            <TableCell>
              <PersonCenters allocation={a} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(a.total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Body(props: Props & { view: View }) {
  const { allocations, isLoading, error, onRetry, view } = props;
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(error, 'Não foi possível calcular o rateio do mês.')}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (allocations.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">Ninguém com custo neste mês.</p>;
  return (
    <div className="space-y-4">
      <Summary allocations={allocations} />
      <div className="overflow-x-auto">
        {view === View.ByCenter ? <ByCenterTable allocations={allocations} /> : <ByPersonTable allocations={allocations} />}
      </div>
    </div>
  );
}

export function CostCenterAllocationCard(props: Props) {
  const { allocations, monthKey, monthLabel } = props;
  const [view, setView] = useState<View>(View.ByCenter);
  const exportCsv = () => downloadCsv(`rateio-centro-de-custo-${monthKey ?? ''}.csv`, ALLOCATION_CSV_HEADERS, allocationCsvRows(allocations));
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Rateio por centro de custo{monthLabel ? ` — ${monthLabel}` : ''}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <ToggleGroup type="single" size="sm" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Ver rateio">
              <ToggleGroupItem value={View.ByCenter}>Por centro</ToggleGroupItem>
              <ToggleGroupItem value={View.ByPerson}>Por pessoa</ToggleGroupItem>
            </ToggleGroup>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={allocations.length === 0}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </Button>
          </div>
        </div>
        <CardDescription className="max-w-3xl">
          Cada centro recebe as horas lançadas nele × o custo-hora do mês. "Não lançado" é a jornada que não virou lançamento e
          fica sem centro até alguém decidir. Quem não lança hora vai inteiro para o centro de lotação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Body {...props} view={view} />
      </CardContent>
    </Card>
  );
}
