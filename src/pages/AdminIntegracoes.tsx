import { AppLayout } from '@/components/layout/AppLayout';
import { ContaAzulCard } from '@/components/integrations/ContaAzulCard';

export default function AdminIntegracoes() {
  return (
    <AppLayout
      title="Integrações"
      description="Sistemas externos ligados à empresa. Cada empresa conecta a própria conta, e o Pulse nunca vê nem guarda a sua senha."
      breadcrumbs={[{ label: 'Configurações', href: '/admin' }, { label: 'Integrações' }]}
    >
      <div className="max-w-3xl">
        <ContaAzulCard />
      </div>
    </AppLayout>
  );
}
