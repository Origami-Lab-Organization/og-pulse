import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenueOutsideProjects } from '@/hooks/useConciliacao';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { formatCNPJ } from '@/lib/masks';
import type { RevenueOutsideProjectsRow } from '@/types/conciliacao';

/**
 * Receita que entrou no Conta Azul sem parcela de projeto no Pulse, por cliente. É a maior
 * fonte da diferença entre os números (01/10/2026: 89 de 109 recebimentos). "Cliente existe,
 * sem parcela" e "cliente nem existe no Pulse" pedem ações diferentes, e a tela separa.
 */

function Summary({ rows }: { rows: RevenueOutsideProjectsRow[] }) {
  const total = rows.reduce((s, r) => s + Number(r.gross_total), 0);
  const unknownClients = rows.filter((r) => !r.client_id).length;
  const count = rows.reduce((s, r) => s + Number(r.installments), 0);
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium tabular-nums text-foreground">{formatCurrency(total)}</span> em{' '}
      <span className="tabular-nums">{count}</span> recebimentos de <span className="tabular-nums">{rows.length}</span>{' '}
      clientes no período, sem parcela de projeto no Pulse.{' '}
      {unknownClients > 0 && (
        <>
          <span className="tabular-nums">{unknownClients}</span> desses clientes nem estão cadastrados no Pulse.
        </>
      )}
    </p>
  );
}

function ClientCell({ row }: { row: RevenueOutsideProjectsRow }) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-foreground">{row.person_name ?? 'Sem cliente no Conta Azul'}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {row.person_document && <span className="tabular-nums">{formatCNPJ(row.person_document)}</span>}
        {row.client_id ? (
          <Badge variant="info">Cliente no Pulse, sem parcela</Badge>
        ) : (
          <Badge variant="neutral">{row.person_document ? 'Não cadastrado no Pulse' : 'Sem CNPJ no Conta Azul'}</Badge>
        )}
      </div>
    </div>
  );
}

function RowsTable({ rows }: { rows: RevenueOutsideProjectsRow[] }) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Toda a receita do período passa por parcela de projeto.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente no Conta Azul</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Recebimentos</TableHead>
            <TableHead className="text-right">Valor bruto</TableHead>
            <TableHead className="text-right">Recebido</TableHead>
            <TableHead>Último vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.person_ca_id ?? 'sem'}-${row.client_id ?? 'fora'}`}>
              <TableCell className="max-w-xs">
                <ClientCell row={row} />
              </TableCell>
              <TableCell className="max-w-xs text-sm text-muted-foreground">{row.categories ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{row.installments}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatCurrency(Number(row.gross_total))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(Number(row.paid_total))}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{formatDate(row.last_due)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function RevenueOutsideProjects(props: { from: string; to: string }) {
  const { from, to } = props;
  const { data: rows = [], isLoading, isError, error, refetch } = useRevenueOutsideProjects(from, to);
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(b.gross_total) - Number(a.gross_total)), [rows]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(error, 'Não foi possível carregar a receita fora dos projetos.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Summary rows={sorted} />
      <Card>
        <CardContent className="p-0 sm:p-2">
          <RowsTable rows={sorted} />
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        Para trazer uma dessas receitas para o Pulse, cadastre o cliente em{' '}
        <Link to="/clients" className="font-medium text-primary underline-offset-4 hover:underline">
          Clientes
        </Link>{' '}
        e o projeto com as parcelas; na próxima sincronização ela casa sozinha pela NF.
      </p>
    </div>
  );
}
