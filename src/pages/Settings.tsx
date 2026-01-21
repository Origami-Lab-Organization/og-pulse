import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSettingsForm } from '@/components/settings/FinancialSettingsForm';
import { DollarSign } from 'lucide-react';

export default function Settings() {
  return (
    <AppLayout 
      title="Configurações" 
      description="Gerencie as configurações do sistema"
      breadcrumbs={[{ label: 'Configurações' }]}
    >
      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <FinancialSettingsForm />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
