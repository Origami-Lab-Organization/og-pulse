/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { CapabilityOverridesSettings } from '@/components/settings/CapabilityOverridesSettings';

export default function AdminExcecoes() {
  return (
    <AppLayout
      title="Exceções de acesso"
      description="Capacidade concedida ou revogada para uma pessoa específica, por cima do perfil dela. Vale no banco, não só na tela. Se a mesma exceção aparecer em várias pessoas, o que falta é um perfil."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Exceções' }]}
    >
      <CapabilityOverridesSettings />
    </AppLayout>
  );
}
