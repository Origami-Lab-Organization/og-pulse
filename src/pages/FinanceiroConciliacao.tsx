import { Link } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { ReceivablesReconciliation } from '@/components/conciliacao/ReceivablesReconciliation';
import { SyncButton } from '@/components/integrations/ContaAzulCard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useContaAzulConnection } from '@/hooks/useContaAzulConnection';
import { ContaAzulConnectionStatus } from '@/types/contaAzul';
import type { ContaAzulConnection } from '@/types/contaAzul';

const INTEGRATIONS_PATH = '/admin/integracoes';

function NotConnected() {
  return (
    <Card className="max-w-xl">
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <p className="text-sm text-muted-foreground">
          A conciliação compara o Pulse com o Conta Azul. Conecte a conta da empresa para começar.
        </p>
        <Button asChild>
          <Link to={INTEGRATIONS_PATH}>Ir para Integrações</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ConnectionNotices({ connection }: { connection: ContaAzulConnection }) {
  if (connection.status === ContaAzulConnectionStatus.Reconnect) {
    return (
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>O Conta Azul não aceita mais a autorização</AlertTitle>
        <AlertDescription>
          Os dados abaixo param na última sincronização.{' '}
          <Link to={INTEGRATIONS_PATH} className="font-medium underline underline-offset-4">
            Conecte de novo em Integrações
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }
  if (connection.backfill_done_at) return null;
  return (
    <Alert variant="info">
      <Info className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>A primeira carga do Conta Azul ainda está em andamento</AlertTitle>
      <AlertDescription>
        Parcelas que ainda não chegaram aparecem como "Só no Pulse". A conciliação fica completa quando a carga terminar.
      </AlertDescription>
    </Alert>
  );
}

function Content() {
  const { data: connection, isLoading } = useContaAzulConnection();
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!connection) return <NotConnected />;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ConnectionNotices connection={connection} />
        {connection.status === ContaAzulConnectionStatus.Active && <SyncButton connection={connection} />}
      </div>
      <ReceivablesReconciliation />
    </div>
  );
}

/** Financeiro › Conciliação (ADR-0044, parte 3). Só Admin por enquanto (decisão de 01/10/2026). */
export default function FinanceiroConciliacao() {
  return (
    <AppLayout
      title="Conciliação"
      description="Parcelas do Pulse ao lado do que o Conta Azul registrou. Mesma NF e mesmo CNPJ casam sozinhos e dão baixa; o resto espera você confirmar."
      breadcrumbs={[{ label: 'Financeiro', href: '/financeiro/conciliacao' }, { label: 'Conciliação' }]}
    >
      <Content />
    </AppLayout>
  );
}
