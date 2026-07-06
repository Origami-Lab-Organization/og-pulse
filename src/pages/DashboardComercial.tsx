import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLeads } from '@/hooks/useLeads';
import { useAllPendingFollowUps } from '@/hooks/useLeadFollowUps';
import { FollowUpsUrgentesWidget } from '@/components/dashboard/comercial/FollowUpsUrgentesWidget';
import { OportunidadesRiscoWidget } from '@/components/dashboard/comercial/OportunidadesRiscoWidget';
import { KpisDoMesWidget } from '@/components/dashboard/comercial/KpisDoMesWidget';
import { PipelineRapidoWidget } from '@/components/dashboard/comercial/PipelineRapidoWidget';
import { MeusLeadsWidget } from '@/components/dashboard/comercial/MeusLeadsWidget';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function DashboardComercial() {
  const { employee } = useAuth();
  const firstName = employee?.nome?.split(' ')[0] ?? '';
  const greeting = firstName ? `${getGreeting()}, ${firstName}!` : `${getGreeting()}!`;

  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { data: followUps = [], isLoading: loadingFollowUps } = useAllPendingFollowUps();

  const isLoading = loadingLeads || loadingFollowUps;

  return (
    <AppLayout title={greeting} description="Aqui estão suas urgências e o andamento do mês">
      <div className="space-y-4">
        {/* Linha 1: Follow-ups urgentes + Oportunidades em risco */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FollowUpsUrgentesWidget
            followUps={followUps}
            leads={leads}
            isLoading={isLoading}
          />
          <OportunidadesRiscoWidget
            leads={leads}
            followUps={followUps}
            isLoading={isLoading}
          />
        </div>

        {/* Linha 2: KPIs do mês (3 cards) */}
        <KpisDoMesWidget />

        {/* Linha 3: Pipeline rápido + Meus Leads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <PipelineRapidoWidget leads={leads} isLoading={loadingLeads} />
          </div>
          <MeusLeadsWidget leads={leads} isLoading={loadingLeads} />
        </div>
      </div>
    </AppLayout>
  );
}
