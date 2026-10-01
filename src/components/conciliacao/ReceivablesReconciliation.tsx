import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useReceivablesReconciliation } from '@/hooks/useConciliacao';
import {
  CONTA_AZUL_STATUS_LABEL,
  DIVERGENCE_LABEL,
  pulseStatusLabel,
  SITUATION_LABEL,
  situationOf,
  divergencesOf,
  summarize,
  withholdingOf,
} from '@/lib/conciliacao';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { ReconciliationSituation } from '@/types/conciliacao';
import type { ReceivableReconciliationRow } from '@/types/conciliacao';
import { ReconciliationRowActions } from './ReconciliationRowActions';

const SITUATION_BADGE: Record<ReconciliationSituation, 'success' | 'warning' | 'info' | 'neutral'> = {
  [ReconciliationSituation.Matched]: 'success',
  [ReconciliationSituation.Divergent]: 'warning',
  [ReconciliationSituation.Suggested]: 'info',
  [ReconciliationSituation.OnlyPulse]: 'neutral',
  [ReconciliationSituation.OnlyContaAzul]: 'neutral',
};

const SITUATION_SINGULAR: Record<ReconciliationSituation, string> = {
  [ReconciliationSituation.Matched]: 'Casada',
  [ReconciliationSituation.Divergent]: 'Com divergência',
  [ReconciliationSituation.Suggested]: 'Para confirmar',
  [ReconciliationSituation.OnlyPulse]: 'Só no Pulse',
  [ReconciliationSituation.OnlyContaAzul]: 'Só no Conta Azul',
};

const SITUATIONS = Object.values(ReconciliationSituation);
const dueOf = (row: ReceivableReconciliationRow) => row.pulse_due_date ?? row.ca_due_date ?? '';

function WhoCell({ row }: { row: ReceivableReconciliationRow }) {
  if (!row.installment_id) {
    return (
      <div className="min-w-0">
        <p className="font-medium text-foreground">{row.ca_person_name ?? 'Sem cliente no Conta Azul'}</p>
        {row.ca_description && <p className="truncate text-sm text-muted-foreground">{row.ca_description}</p>}
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <p className="font-medium text-foreground">{row.client_name ?? 'Sem cliente'}</p>
      <p className="text-sm text-muted-foreground">
        <Link to={`/projects/${row.project_id}`} className="underline-offset-4 hover:underline focus-visible:underline">
          {row.project_name}
        </Link>
        {' · '}parcela {row.installment_number}
        {row.pulse_invoice_number ? ` · NF ${row.pulse_invoice_number}` : ''}
      </p>
    </div>
  );
}

function PulseCell({ row, today }: { row: ReceivableReconciliationRow; today: Date }) {
  if (!row.installment_id) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="text-sm">
      <p className="font-medium tabular-nums text-foreground">{formatCurrency(Number(row.pulse_value))}</p>
      <p className="text-muted-foreground">
        {pulseStatusLabel(row, today)}
        {row.pulse_payment_date ? ` em ${formatDate(row.pulse_payment_date)}` : ''}
      </p>
    </div>
  );
}

function ContaAzulCell({ row }: { row: ReceivableReconciliationRow }) {
  if (!row.ca_id) return <span className="text-muted-foreground">—</span>;
  const withholding = withholdingOf(row);
  return (
    <div className="text-sm">
      <p className="font-medium tabular-nums text-foreground">{formatCurrency(Number(row.ca_gross))}</p>
      <p className="text-muted-foreground">
        {row.ca_status ? CONTA_AZUL_STATUS_LABEL[row.ca_status] : ''}
        {row.ca_payment_date ? ` em ${formatDate(row.ca_payment_date)}` : ''}
      </p>
      {withholding != null && (
        <p className="text-muted-foreground">
          líquido {formatCurrency(Number(row.ca_net))} · retenção {formatCurrency(withholding)}
        </p>
      )}
    </div>
  );
}

function SituationCell({ row }: { row: ReceivableReconciliationRow }) {
  const situation = situationOf(row);
  const divergences = divergencesOf(row);
  return (
    <div className="space-y-1 text-sm">
      <Badge variant={SITUATION_BADGE[situation]}>{SITUATION_SINGULAR[situation]}</Badge>
      {divergences.length > 0 && <p className="text-muted-foreground">{divergences.map((d) => DIVERGENCE_LABEL[d]).join(', ')}</p>}
      {row.received_applied_at && (
        <p className="text-muted-foreground">
          {row.received_applied_auto ? 'Baixa automática' : 'Baixa levada'} em {formatDate(row.received_applied_at)}
        </p>
      )}
    </div>
  );
}

function SummaryFilter(props: {
  rows: ReceivableReconciliationRow[];
  selected: ReconciliationSituation | null;
  onSelect: (s: ReconciliationSituation | null) => void;
}) {
  const { rows, selected, onSelect } = props;
  const summary = useMemo(() => summarize(rows), [rows]);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="group" aria-label="Filtrar por situação">
      {SITUATIONS.map((situation) => (
        <button
          key={situation}
          type="button"
          aria-pressed={selected === situation}
          onClick={() => onSelect(selected === situation ? null : situation)}
          className={cn(
            'rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            selected === situation && 'border-primary bg-muted',
          )}
        >
          <span className="block text-sm text-muted-foreground">{SITUATION_LABEL[situation]}</span>
          <span className="block text-2xl font-semibold tabular-nums text-foreground">{summary[situation]}</span>
        </button>
      ))}
    </div>
  );
}

function RowsTable({ rows }: { rows: ReceivableReconciliationRow[] }) {
  const today = useMemo(() => new Date(), []);
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma parcela nesta seleção.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parcela</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>No Pulse</TableHead>
            <TableHead>No Conta Azul</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.match_id ?? row.installment_id ?? row.ca_id}>
              <TableCell className="max-w-xs">
                <WhoCell row={row} />
              </TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{formatDate(dueOf(row))}</TableCell>
              <TableCell>
                <PulseCell row={row} today={today} />
              </TableCell>
              <TableCell>
                <ContaAzulCell row={row} />
              </TableCell>
              <TableCell>
                <SituationCell row={row} />
              </TableCell>
              <TableCell>
                <ReconciliationRowActions row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Body(props: { from: string; to: string }) {
  const { data: rows = [], isLoading, isError, error, refetch } = useReceivablesReconciliation(props.from, props.to, true);
  const [selected, setSelected] = useState<ReconciliationSituation | null>(null);
  const sorted = useMemo(() => [...rows].sort((a, b) => dueOf(a).localeCompare(dueOf(b))), [rows]);
  const visible = selected ? sorted.filter((row) => situationOf(row) === selected) : sorted;

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(error, 'Não foi possível carregar a conciliação.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <SummaryFilter rows={sorted} selected={selected} onSelect={setSelected} />
      <Card>
        <CardContent className="p-0 sm:p-2">
          <RowsTable rows={visible} />
        </CardContent>
      </Card>
    </div>
  );
}

/** Conciliação de contas a receber: parcela do Pulse × parcela de receita do Conta Azul. */
export function ReceivablesReconciliation(props: { from: string; to: string }) {
  const { from, to } = props;
  return <Body from={from} to={to} />;
}
