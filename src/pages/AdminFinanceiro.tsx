/**
 * Uma tela por parâmetro da empresa (antes eram nove abas dentro do "Portal do Admin").
 *
 * O cabeçalho do título e da descrição vive aqui, no `AppLayout`, como em toda página do
 * sistema — por isso o componente de dentro não repete o próprio nome. Ver `sidebar-nav.ts`.
 */
import { AppLayout } from '@/components/layout/AppLayout';
import { FinancialSettingsForm } from '@/components/settings/FinancialSettingsForm';

export default function AdminFinanceiro() {
  return (
    <AppLayout
      title="Financeiro"
      description="Os percentuais que a fórmula de markup do orçamento aplica sobre o custo para chegar ao preço de venda."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Financeiro' }]}
    >
      <FinancialSettingsForm />
    </AppLayout>
  );
}
