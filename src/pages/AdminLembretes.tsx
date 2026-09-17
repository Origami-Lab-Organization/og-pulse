/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { TimesheetReminderSettings } from '@/components/admin/TimesheetReminderSettings';

export default function AdminLembretes() {
  return (
    <AppLayout
      title="Lembretes de timesheet"
      description="Os avisos automáticos que saem para quem tem hora faltando e para os gerentes dessas pessoas."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Lembretes' }]}
    >
      <TimesheetReminderSettings />
    </AppLayout>
  );
}
