import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { TimesheetStatusWidget } from '@/components/dashboard/TimesheetStatusWidget';
import { AgendaHojeWidget } from '@/components/dashboard/AgendaHojeWidget';
import { MinhasTarefasWidget } from '@/components/dashboard/MinhasTarefasWidget';
import { NotificacoesRecentesWidget } from '@/components/dashboard/NotificacoesRecentesWidget';
import { MeusProjetosWidget } from '@/components/dashboard/MeusProjetosWidget';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { employee } = useAuth();
  const firstName = employee?.nome?.split(' ')[0] ?? '';
  const greeting = firstName ? `${getGreeting()}, ${firstName}!` : `${getGreeting()}!`;

  return (
    <AppLayout title={greeting} description="Aqui está o resumo do seu dia">
      <div className="space-y-4">
        {/* Timesheet vira faixa: mantém o sinal de pendência sem ocupar o card
            de destaque, que agora é a agenda do dia. */}
        <TimesheetStatusWidget variant="compact" />

        {/* Linha 1: Agenda + Tarefas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AgendaHojeWidget />
          <MinhasTarefasWidget />
        </div>

        {/* Linha 2: Notificações + Projetos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NotificacoesRecentesWidget />
          <div className="md:col-span-2">
            <MeusProjetosWidget />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
