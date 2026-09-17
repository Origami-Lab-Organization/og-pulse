/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { AccessProfilesSettings } from '@/components/settings/AccessProfilesSettings';

export default function AdminPerfis() {
  return (
    <AppLayout
      title="Perfis de acesso"
      description="Cada pessoa tem um perfil. Abra um para ver e editar o que ele permite. Para quem acumula funções, crie um perfil com as duas atribuições em vez de dar exceções individuais."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Perfis de Acesso' }]}
    >
      <AccessProfilesSettings />
    </AppLayout>
  );
}
