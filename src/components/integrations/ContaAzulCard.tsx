import { useState } from 'react';
import { AlertTriangle, Link2, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  isSyncing,
  useContaAzulConnection,
  useDisconnectContaAzul,
  useStartContaAzulConnection,
  useSyncContaAzul,
} from '@/hooks/useContaAzulConnection';
import { formatDate } from '@/lib/formatters';
import { formatCNPJ } from '@/lib/masks';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { ContaAzulConnectionStatus } from '@/types/contaAzul';
import type { ContaAzulConnection } from '@/types/contaAzul';

/**
 * Conexão da empresa com o Conta Azul (ADR-0044, parte 1). Quem chega aqui tem
 * `integracoes:gerir`; o token nunca passa pelo navegador — a tela só mostra a empresa ligada.
 */

function ConnectButton({ label }: { label: string }) {
  const start = useStartContaAzulConnection();
  return (
    <Button onClick={() => start.mutate()} disabled={start.isPending}>
      {start.isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {start.isPending ? 'Abrindo o Conta Azul…' : label}
    </Button>
  );
}

function DisconnectButton() {
  const [open, setOpen] = useState(false);
  const disconnect = useDisconnectContaAzul();
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)} disabled={disconnect.isPending}>
        {disconnect.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Unplug className="mr-2 h-4 w-4" aria-hidden="true" />
        )}
        Desconectar
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar o Conta Azul?</AlertDialogTitle>
          <AlertDialogDescription>
            A autorização é revogada no Conta Azul e o Pulse para de ler os dados de lá. Nada é apagado no Conta
            Azul. Para voltar, será preciso conectar de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => disconnect.mutate()}>Desconectar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SyncButton({ connection }: { connection: ContaAzulConnection }) {
  const sync = useSyncContaAzul();
  const running = sync.isPending || isSyncing(connection);
  return (
    <Button variant="outline" onClick={() => sync.mutate()} disabled={running}>
      {running ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
      )}
      {running ? 'Sincronizando…' : 'Sincronizar agora'}
    </Button>
  );
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** O cursor aponta o PRÓXIMO mês a carregar: o último lido é o anterior a ele. */
function lastLoadedMonth(cursor: string): string {
  const [year, month] = cursor.split('-').map(Number);
  return new Date(Date.UTC(year, month - 2, 1)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function backfillLine(connection: ContaAzulConnection): string | null {
  if (connection.backfill_done_at) return null;
  if (!connection.backfill_cursor) return 'A primeira carga começa na próxima sincronização (em até 15 minutos).';
  return `Primeira carga em andamento: histórico lido até ${lastLoadedMonth(connection.backfill_cursor)}.`;
}

function SyncStatus({ connection }: { connection: ContaAzulConnection }) {
  const backfill = backfillLine(connection);
  return (
    <div className="space-y-1 text-sm" aria-live="polite">
      <p className="text-foreground">
        <span className="tabular-nums">{connection.receivable_count}</span> contas a receber ·{' '}
        <span className="tabular-nums">{connection.payable_count}</span> contas a pagar
      </p>
      <p className="text-muted-foreground">
        {connection.last_sync_at
          ? `Última sincronização: ${formatDateTime(connection.last_sync_at)}.`
          : 'Ainda não sincronizado.'}{' '}
        {backfill}
      </p>
    </div>
  );
}

function SyncError({ connection }: { connection: ContaAzulConnection }) {
  if (!connection.last_error || connection.status === ContaAzulConnectionStatus.Reconnect) return null;
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>A última sincronização não terminou</AlertTitle>
      <AlertDescription>{connection.last_error}</AlertDescription>
    </Alert>
  );
}

function NotConnected() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        Você vai entrar com o usuário do Conta Azul da empresa e autorizar o Pulse. O Conta Azul pede permissão de
        administrador, mas o Pulse só lê: nada é lançado nem alterado lá.
      </p>
      <ConnectButton label="Conectar ao Conta Azul" />
    </div>
  );
}

function CompanyDetails({ connection }: { connection: ContaAzulConnection }) {
  const name = connection.ca_trade_name || connection.ca_legal_name || 'Empresa sem nome no Conta Azul';
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      <div className="min-w-0">
        <dt className="text-muted-foreground">Empresa no Conta Azul</dt>
        <dd className="truncate font-medium text-foreground" title={connection.ca_legal_name ?? undefined}>
          {name}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">CNPJ</dt>
        <dd className="font-medium tabular-nums text-foreground">
          {connection.ca_document ? formatCNPJ(connection.ca_document) : '-'}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Conectado em</dt>
        <dd className="font-medium text-foreground">{formatDate(connection.connected_at)}</dd>
      </div>
    </dl>
  );
}

function Connected({ connection }: { connection: ContaAzulConnection }) {
  const needsReconnect = connection.status === ContaAzulConnectionStatus.Reconnect;
  return (
    <div className="flex flex-col gap-4">
      {needsReconnect && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>O Conta Azul não aceita mais esta autorização</AlertTitle>
          <AlertDescription>
            {connection.last_error ?? 'A autorização foi revogada ou venceu.'} Conecte de novo com a mesma conta.
          </AlertDescription>
        </Alert>
      )}
      <CompanyDetails connection={connection} />
      {!needsReconnect && <SyncError connection={connection} />}
      {!needsReconnect && <SyncStatus connection={connection} />}
      <div className="flex flex-wrap gap-2">
        {needsReconnect ? <ConnectButton label="Conectar de novo" /> : <SyncButton connection={connection} />}
        <DisconnectButton />
      </div>
    </div>
  );
}

function StatusBadge({ connection }: { connection: ContaAzulConnection | null }) {
  if (!connection) return <Badge variant="neutral">Não conectado</Badge>;
  if (connection.status === ContaAzulConnectionStatus.Reconnect) return <Badge variant="warning">Reconectar</Badge>;
  return <Badge variant="success">Conectado</Badge>;
}

function CardBody() {
  const { data: connection, isLoading, isError, error, refetch } = useContaAzulConnection();
  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/40 bg-destructive-subtle p-4 text-sm text-destructive">
        <p>{mensagemParaUsuario(error, 'Não foi possível ler a conexão com o Conta Azul.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  return connection ? <Connected connection={connection} /> : <NotConnected />;
}

function HeaderBadge() {
  const { data: connection, isLoading, isError } = useContaAzulConnection();
  if (isLoading || isError) return null;
  return <StatusBadge connection={connection ?? null} />;
}

export function ContaAzulCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Conta Azul</CardTitle>
          <CardDescription>
            Traz as contas a receber e a pagar para conciliar com o que o Pulse registra.
          </CardDescription>
        </div>
        <HeaderBadge />
      </CardHeader>
      <CardContent>
        <CardBody />
      </CardContent>
    </Card>
  );
}
