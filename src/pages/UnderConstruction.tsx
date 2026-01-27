import { AppLayout } from '@/components/layout/AppLayout';
import { Construction } from 'lucide-react';

const UnderConstruction = () => {
  return (
    <AppLayout
      title="Visão Geral"
      description="Acompanhe o resumo das suas atividades"
      breadcrumbs={[{ label: 'Visão Geral' }]}
    >
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-muted p-6 mb-6">
          <Construction className="h-12 w-12 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Em Construção
        </h2>
        <p className="text-muted-foreground max-w-md">
          Estamos trabalhando para trazer novas funcionalidades para você. 
          Em breve, esta área estará disponível.
        </p>
      </div>
    </AppLayout>
  );
};

export default UnderConstruction;
