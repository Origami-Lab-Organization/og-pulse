import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Zap, ArrowLeft, Sparkles } from 'lucide-react';

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

const formSchema = z.object({
  product: z.string().min(10, 'Mínimo 10 caracteres'),
  targetCustomer: z.string().min(10, 'Mínimo 10 caracteres'),
  market: z.string().min(5, 'Mínimo 5 caracteres'),
  stage: z.string().min(1, 'Selecione uma opção'),
  revenueModel: z.string().min(5, 'Mínimo 5 caracteres'),
  differentials: z.string().min(10, 'Mínimo 10 caracteres'),
  mainChallenge: z.string().min(10, 'Mínimo 10 caracteres'),
});

type FormData = z.infer<typeof formSchema>;

const stageOptions = [
  'Ideia / Pré-MVP',
  'MVP em desenvolvimento',
  'MVP lançado / validando',
  'Crescimento',
  'Escala',
];

const MarketAnalysisPage = () => {
  const [selectedModule, setSelectedModule] = useState<number | 'all' | null>(null);
  const [currentStep, setCurrentStep] = useState<'selection' | 'form' | 'loading' | 'result'>('selection');
  const [formData, setFormData] = useState<FormData | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: '',
      targetCustomer: '',
      market: '',
      stage: '',
      revenueModel: '',
      differentials: '',
      mainChallenge: '',
    },
  });

  const handleSelectModule = (mod: number | 'all') => {
    setSelectedModule(mod);
    setCurrentStep('form');
  };

  const handleBack = () => {
    setSelectedModule(null);
    setCurrentStep('selection');
  };

  const onSubmit = (values: FormData) => {
    setFormData(values);
    setCurrentStep('loading');
  };

  const selectedModuleLabel =
    selectedModule === 'all'
      ? 'Análise Completa'
      : modules.find((m) => m.number === selectedModule)?.title ?? '';

  return (
    <AppLayout
      title="Análise de Mercado"
      description="Acompanhe tendências e métricas de mercado"
      breadcrumbs={[{ label: 'Marketing' }, { label: 'Análise de Mercado' }]}
    >
      {/* ── STEP: SELECTION ── */}
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
            <Button size="lg" className="text-base px-8 py-6 gap-2" onClick={() => handleSelectModule('all')}>
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
                    <Badge variant="secondary" className="text-xs px-2 py-0.5">{mod.number}</Badge>
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

      {/* ── STEP: FORM ── */}
      {currentStep === 'form' && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{selectedModuleLabel}</h2>
              <p className="text-sm text-muted-foreground">Preencha o contexto do seu negócio para gerar a análise.</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* product */}
              <FormField
                control={form.control}
                name="product"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que é o seu produto ou serviço?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o que é, como funciona e qual problema resolve" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* targetCustomer */}
              <FormField
                control={form.control}
                name="targetCustomer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quem é o seu cliente-alvo?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Perfil, cargo, segmento, comportamento de compra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* market + stage (2 cols) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="market"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Em qual mercado e região você atua?</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SaaS B2B, Brasil e LATAM" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qual o estágio atual do negócio?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stageOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* revenueModel */}
              <FormField
                control={form.control}
                name="revenueModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Como você monetiza?</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Assinatura mensal, freemium, licença anual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* differentials */}
              <FormField
                control={form.control}
                name="differentials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O que você acredita que diferencia seu produto hoje?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Pode ser uma hipótese ainda não validada" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* mainChallenge */}
              <FormField
                control={form.control}
                name="mainChallenge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual é o maior desafio ou pergunta estratégica que você tem hoje?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="O que mais trava o crescimento ou validação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" size="lg" className="gap-2" disabled={!form.formState.isValid}>
                  <Sparkles className="h-5 w-5" />
                  Gerar Análise
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </AppLayout>
  );
};

export default MarketAnalysisPage;
