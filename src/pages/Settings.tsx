import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSettingsForm } from '@/components/settings/FinancialSettingsForm';
import { PayrollProfileSettingsForm } from '@/components/settings/PayrollProfileSettingsForm';
import { HolidaysSettingsForm } from '@/components/settings/HolidaysSettingsForm';
import { DollarSign, Receipt, PartyPopper } from 'lucide-react';

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
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Encargos/Folha
          </TabsTrigger>
          <TabsTrigger value="holidays" className="flex items-center gap-2">
            <PartyPopper className="h-4 w-4" />
            Feriados/Folgas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <FinancialSettingsForm />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <PayrollProfileSettingsForm />
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <HolidaysSettingsForm />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
