/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { PayrollProfileSettingsForm } from '@/components/settings/PayrollProfileSettingsForm';

export default function AdminEncargos() {
  return (
    <AppLayout
      title="Encargos e folha"
      description="Alíquotas de CLT, de pró-labore e incidência sobre provisões. É daqui que sai o custo real de cada pessoa por hora."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Encargos/Folha' }]}
    >
      <PayrollProfileSettingsForm />
    </AppLayout>
  );
}
