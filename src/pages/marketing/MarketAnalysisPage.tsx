import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

const modules = [
  { number: 1, title: 'Market Sizing & TAM Analysis', shortName: 'Dimensionamento', description: 'Estime o tamanho total do mercado, segmentos endereçáveis e oportunidades de crescimento.' },
  { number: 2, title: 'Competitive Landscape Deep Dive', shortName: 'Concorrência', description: 'Mapeie concorrentes diretos e indiretos, posicionamento e diferenciais competitivos.' },
  { number: 3, title: 'Customer Persona & Segmentation', shortName: 'Personas', description: 'Defina perfis de cliente ideais, segmentos prioritários e critérios de qualificação.' },
  { number: 4, title: 'Industry Trend Analysis', shortName: 'Tendências', description: 'Identifique macro e micro tendências que impactam o setor e oportunidades emergentes.' },
  { number: 5, title: 'SWOT + Porter\'s Five Forces', shortName: 'Forças e Fraquezas', description: 'Análise estruturada de forças, fraquezas, oportunidades, ameaças e dinâmicas competitivas.' },
  { number: 6, title: 'Pricing Strategy Analysis', shortName: 'Precificação', description: 'Avalie modelos de precificação, elasticidade e posicionamento de preço no mercado.' },
  { number: 7, title: 'Go-To-Market Strategy', shortName: 'Entrada no Mercado', description: 'Planeje canais de distribuição, messaging e estratégia de lançamento.' },
  { number: 8, title: 'Customer Journey Mapping', shortName: 'Jornada do Cliente', description: 'Mapeie pontos de contato, fricções e oportunidades ao longo da jornada do cliente.' },
  { number: 9, title: 'Financial Modeling & Unit Economics', shortName: 'Modelagem Financeira', description: 'Projete receitas, custos unitários, LTV, CAC e métricas financeiras chave.' },
  { number: 10, title: 'Risk Assessment & Scenario Planning', shortName: 'Riscos e Cenários', description: 'Identifique riscos estratégicos e modele cenários otimista, base e pessimista.' },
  { number: 11, title: 'Market Entry & Expansion Strategy', shortName: 'Expansão', description: 'Avalie estratégias de entrada em novos mercados e planos de expansão geográfica.' },
  { number: 12, title: 'Executive Strategy Synthesis', shortName: 'Síntese Executiva', description: 'Consolide insights de todos os módulos em um plano estratégico executivo.' },
];

const MarketAnalysisPage = () => {
  const [selectedModule, setSelectedModule] = useState<number | 'all' | null>(null);
  const [currentStep, setCurrentStep] = useState<'selection' | 'form' | 'loading' | 'result'>('selection');

  const handleSelectModule = (mod: number | 'all') => {
    setSelectedModule(mod);
    setCurrentStep('form');
  };

  return (
    <AppLayout
      title="Análise de Mercado"
      description="Acompanhe tendências e métricas de mercado"
      breadcrumbs={[{ label: 'Marketing' }, { label: 'Análise de Mercado' }]}
    >
      {currentStep === 'selection' && (
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Qual análise você quer realizar?
            </h1>
            <p className="text-muted-foreground mt-2">
              Selecione um módulo para começar. Você pode rodar análises individuais ou a sequência completa.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              className="text-base px-8 py-6 gap-2"
              onClick={() => handleSelectModule('all')}
            >
              <Zap className="h-5 w-5" />
              Análise Completa (Módulos 1 ao 12)
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
            {modules.map((mod) => (
              <Card
                key={mod.number}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => handleSelectModule(mod.number)}
              >
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">
                      {mod.number}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{mod.shortName}</span>
                  </div>
                  <CardTitle className="text-base">{mod.title}</CardTitle>
                  <CardDescription className="text-sm">{mod.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MarketAnalysisPage;
