import { useState } from 'react';
import { Plus, Palmtree, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { VacationBalanceCard } from '@/components/vacation/VacationBalanceCard';
import { VacationRequestList } from '@/components/vacation/VacationRequestList';
import { VacationRequestDialog } from '@/components/vacation/VacationRequestDialog';
import { useMyVacation, useCancelVacationRequest } from '@/hooks/useVacations';
import { CONTRACT_TYPE_LABELS } from '@/types/employee';

export default function MyVacation() {
  const { data, isLoading, isError } = useMyVacation();
  const cancelRequest = useCancelVacationRequest();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Só consideramos a eligibilidade quando o perfil realmente carregou.
  const eligible = !!data?.profile.eligible;
  const availableDays = data?.balance.availableDays ?? 0;

  const handleCancel = (requestId: string) => cancelRequest.mutate(requestId);

  const actions = eligible ? (
    <Button onClick={() => setDialogOpen(true)} disabled={availableDays === 0}>
      <Plus className="mr-2 h-4 w-4" />
      Solicitar férias
    </Button>
  ) : undefined;

  return (
    <AppLayout
      title="Minhas Férias"
      description="Acompanhe seu saldo e solicite seus períodos de férias."
      actions={actions}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <p className="font-medium">Não foi possível carregar suas férias</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Tente recarregar a página. Se o problema persistir, o módulo pode ainda não estar
              configurado neste ambiente — fale com o administrador.
            </p>
          </CardContent>
        </Card>
      ) : !data.profile.eligible ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Palmtree className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Seu contrato não prevê férias neste módulo</p>
            <p className="max-w-md text-sm text-muted-foreground">
              A gestão de férias está disponível apenas para contratos CLT e Menor Aprendiz.
              {data.profile.contractType
                ? ` Seu contrato atual é "${CONTRACT_TYPE_LABELS[data.profile.contractType] ?? data.profile.contractType}".`
                : ''}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <VacationBalanceCard balance={data.balance} />

          {data.requestsError && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Não foi possível carregar suas solicitações agora.
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Minhas solicitações</h2>
            <VacationRequestList
              requests={data.requests}
              onCancel={handleCancel}
              cancelingId={cancelRequest.isPending ? cancelRequest.variables ?? null : null}
            />
          </div>

          <VacationRequestDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            availableDays={availableDays}
          />
        </div>
      )}
    </AppLayout>
  );
}
