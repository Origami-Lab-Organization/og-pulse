import { AppLayout } from '@/components/layout/AppLayout';

const MarketAnalysisPage = () => {
  return (
    <AppLayout
      title="Análise de Mercado"
      description="Acompanhe tendências e métricas de mercado"
      breadcrumbs={[{ label: 'Marketing' }, { label: 'Análise de Mercado' }]}
    >
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground text-lg">Em breve: dashboards de análise de mercado.</p>
      </div>
    </AppLayout>
  );
};

export default MarketAnalysisPage;
