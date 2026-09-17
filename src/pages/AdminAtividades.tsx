/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { ActivityTypesSettings } from '@/components/settings/ActivityTypesSettings';

export default function AdminAtividades() {
  return (
    <AppLayout
      title="Atividades internas"
      description="As categorias para lançar hora fora de projeto — administrativo, marketing, comercial. Cada uma aponta para um centro de custo."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Atividades' }]}
    >
      <ActivityTypesSettings />
    </AppLayout>
  );
}
