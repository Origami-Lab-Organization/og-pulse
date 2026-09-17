/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { HolidaysSettingsForm } from '@/components/settings/HolidaysSettingsForm';

export default function AdminFeriados() {
  return (
    <AppLayout
      title="Feriados e folgas"
      description="Os dias que não são contabilizados nos timesheets. Entram no cálculo de dias úteis e de capacidade do mês."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Feriados/Folgas' }]}
    >
      <HolidaysSettingsForm />
    </AppLayout>
  );
}
