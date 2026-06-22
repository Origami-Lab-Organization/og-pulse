import { AppLayout } from '@/components/layout/AppLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { VacationApprovalCard } from '@/components/vacation/VacationApprovalCard';
import { VacationRequestList } from '@/components/vacation/VacationRequestList';
import { usePendingVacationApprovals, useTeamVacationRequests } from '@/hooks/useVacations';

export default function VacationManagement() {
  const { data: pending = [], isLoading: loadingPending } = usePendingVacationApprovals();
  const { data: team = [], isLoading: loadingTeam } = useTeamVacationRequests();

  return (
    <AppLayout
      title="Gestão de Férias"
      description="Aprove solicitações da sua equipe e acompanhe o histórico."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Aguardando sua aprovação
            {pending.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pending.length}
              </span>
            )}
          </h2>

          {loadingPending ? (
            <Skeleton className="h-24 w-full" />
          ) : pending.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma solicitação aguardando sua aprovação.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((request) => (
                <VacationApprovalCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Todas as solicitações</h2>
          {loadingTeam ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <VacationRequestList requests={team} showEmployee />
          )}
        </section>
      </div>
    </AppLayout>
  );
}
