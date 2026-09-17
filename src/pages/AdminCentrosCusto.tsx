/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { CostCentersSettings } from '@/components/settings/CostCentersSettings';

export default function AdminCentrosCusto() {
  return (
    <AppLayout
      title="Centros de custo"
      description="Onde custo e receita são lidos. Serviços, atividades internas e pessoas que não lançam hora apontam para um centro; toda pessoa vê a lista, e só quem configura a empresa edita."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Centros de custo' }]}
    >
      <CostCentersSettings />
    </AppLayout>
  );
}
