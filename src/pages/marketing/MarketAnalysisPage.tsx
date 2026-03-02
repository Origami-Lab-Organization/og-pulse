import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Zap, Sparkles, Loader2, Brain, Search, BarChart2,
  FileText, Check, AlertCircle, RefreshCw, Download, MessageSquare, Send,
  Plus, Trash2, Eye, Clock, AlertTriangle, Save,
} from 'lucide-react';
import {
  useGenerateAnalysis, useRefineAnalysis, useMarketAnalyses,
  useSaveAnalysis, useUpdateAnalysis, useDeleteAnalysis,
  type MarketFormData, type AnalysisResult, type SavedAnalysis,
} from '@/hooks/useMarketAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import { generateDocxFromMarkdown } from '@/utils/generateDocx';
import { generatePdfFromHtml, downloadPdf } from '@/utils/generatePdf';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const modules = [
  { number: 1, title: 'Dimensionamento de Mercado e TAM', shortName: 'Dimensionamento', description: 'Estime o tamanho total do mercado, segmentos endereçáveis e oportunidades de crescimento.' },
  { number: 2, title: 'Panorama Competitivo', shortName: 'Concorrência', description: 'Mapeie concorrentes diretos e indiretos, posicionamento e diferenciais competitivos.' },
  { number: 3, title: 'Persona e Segmentação de Clientes', shortName: 'Personas', description: 'Defina perfis de cliente ideais, segmentos prioritários e critérios de qualificação.' },
  { number: 4, title: 'Análise de Tendências do Setor', shortName: 'Tendências', description: 'Identifique macro e micro tendências que impactam o setor e oportunidades emergentes.' },
  { number: 5, title: 'SWOT e 5 Forças de Porter', shortName: 'Forças e Fraquezas', description: 'Análise estruturada de forças, fraquezas, oportunidades, ameaças e dinâmicas competitivas.' },
  { number: 6, title: 'Estratégia de Precificação', shortName: 'Precificação', description: 'Avalie modelos de precificação, elasticidade e posicionamento de preço no mercado.' },
  { number: 7, title: 'Estratégia Go-To-Market', shortName: 'Entrada no Mercado', description: 'Planeje canais de distribuição, messaging e estratégia de lançamento.' },
  { number: 8, title: 'Mapeamento da Jornada do Cliente', shortName: 'Jornada do Cliente', description: 'Mapeie pontos de contato, fricções e oportunidades ao longo da jornada do cliente.' },
  { number: 9, title: 'Modelagem Financeira e Unit Economics', shortName: 'Modelagem Financeira', description: 'Projete receitas, custos unitários, LTV, CAC e métricas financeiras chave.' },
  { number: 10, title: 'Avaliação de Riscos e Cenários', shortName: 'Riscos e Cenários', description: 'Identifique riscos estratégicos e modele cenários otimista, base e pessimista.' },
  { number: 11, title: 'Estratégia de Entrada e Expansão', shortName: 'Expansão', description: 'Avalie estratégias de entrada em novos mercados e planos de expansão geográfica.' },
  { number: 12, title: 'Síntese Estratégica Executiva', shortName: 'Síntese Executiva', description: 'Consolide insights de todos os módulos em um plano estratégico executivo.' },
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

const stageOptions = [
  'Ideia / Pré-MVP',
  'MVP em desenvolvimento',
  'MVP lançado / validando',
  'Crescimento',
  'Escala',
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const loadingSteps = [
  { label: 'Analisando o contexto do seu negócio...', icon: Brain },
  { label: 'Pesquisando benchmarks e dados do setor...', icon: Search },
  { label: 'Aplicando frameworks estratégicos...', icon: BarChart2 },
  { label: 'Estruturando insights e recomendações...', icon: FileText },
  { label: 'Gerando documento final...', icon: Sparkles },
];

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Análise concluída! Posso aprofundar qualquer seção, ajustar o tom, comparar cenários ou responder perguntas sobre o que foi gerado. O que você quer explorar?',
};

const TEXT_FIELDS: (keyof MarketFormData)[] = ['product', 'targetCustomer', 'market', 'revenueModel', 'differentials', 'mainChallenge'];
const TOTAL_FIELDS = 7;

function computeContextQuality(values: MarketFormData): number {
  let score = 0;
  for (const key of TEXT_FIELDS) {
    if ((values[key]?.length ?? 0) >= 10) score++;
  }
  if (values.stage) score++;
  return Math.round((score / TOTAL_FIELDS) * 100);
}

function getQualityLabel(pct: number): { label: string; className: string } {
  if (pct >= 70) return { label: 'Excelente', className: 'text-green-600 dark:text-green-400' };
  if (pct >= 40) return { label: 'Bom', className: 'text-yellow-600 dark:text-yellow-400' };
  return { label: 'Fraco', className: 'text-red-600 dark:text-red-400' };
}

const MarketAnalysisPage = () => {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [selectedModule, setSelectedModule] = useState<number | 'all' | null>(null);
  const [currentStep, setCurrentStep] = useState<'library' | 'selection' | 'form' | 'loading' | 'result'>('library');
  const [formData, setFormData] = useState<MarketFormData | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [activeLoadingStep, setActiveLoadingStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const generateMutation = useGenerateAnalysis();
  const refineMutation = useRefineAnalysis();
  const saveMutation = useSaveAnalysis();
  const updateMutation = useUpdateAnalysis();
  const deleteMutation = useDeleteAnalysis();
  const { data: savedAnalyses, isLoading: isLoadingAnalyses } = useMarketAnalyses(employee?.id);

  const form = useForm<MarketFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product: '', targetCustomer: '', market: '', stage: '', revenueModel: '', differentials: '', mainChallenge: '',
    },
    mode: 'onChange',
  });

  const watchedValues = form.watch();
  const contextQuality = useMemo(() => computeContextQuality(watchedValues), [watchedValues]);
  const qualityInfo = useMemo(() => getQualityLabel(contextQuality), [contextQuality]);

  const formHasData = useMemo(() => {
    return Object.values(watchedValues).some(v => v && v.length > 0);
  }, [watchedValues]);

  const tryNavigateFromForm = (action: () => void) => {
    if (formHasData) {
      setPendingExitAction(() => action);
      setShowExitConfirm(true);
    } else {
      action();
    }
  };

  const handleSelectModule = (mod: number | 'all') => {
    setSelectedModule(mod);
    setCurrentStep('form');
  };

  const handleBack = () => {
    tryNavigateFromForm(() => {
      setSelectedModule(null);
      setCurrentStep('selection');
    });
  };

  const onSubmit = (values: MarketFormData) => {
    setFormData(values);
    setCurrentStep('loading');
  };

  const handleNewAnalysis = () => {
    setSelectedModule(null);
    setCurrentStep('selection');
    setFormData(null);
    setAnalysisResult(null);
    setSavedAnalysisId(null);
    setIsSaved(false);
    setChatMessages([WELCOME_MESSAGE]);
    setChatInput('');
    form.reset();
    generateMutation.reset();
    refineMutation.reset();
  };

  const handleBackToLibrary = () => {
    setSelectedModule(null);
    setFormData(null);
    setAnalysisResult(null);
    setSavedAnalysisId(null);
    setIsSaved(false);
    setChatMessages([WELCOME_MESSAGE]);
    setChatInput('');
    form.reset();
    generateMutation.reset();
    refineMutation.reset();
    setCurrentStep('library');
  };

  const handleOpenSaved = (analysis: SavedAnalysis) => {
    setAnalysisResult({
      markdown: analysis.result_markdown,
      module: analysis.module,
      moduleLabel: analysis.module_label,
      timestamp: analysis.created_at,
    });
    setSavedAnalysisId(analysis.id);
    setIsSaved(true);
    const history = (analysis.chat_history ?? []) as ChatMessage[];
    setChatMessages(history.length > 0 ? history : [WELCOME_MESSAGE]);
    setCurrentStep('result');
  };

  const handleDeleteAnalysis = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: 'Análise excluída', description: 'A análise foi removida com sucesso.' });
      },
    });
  };

  const handleDownloadWord = async () => {
    if (!analysisResult) return;
    setIsDownloading(true);
    try {
      await generateDocxFromMarkdown(analysisResult.markdown, analysisResult.moduleLabel);
      toast({ title: 'Documento Word baixado!', description: 'O arquivo .docx foi salvo na sua pasta de downloads.' });
    } catch {
      toast({ title: 'Erro ao baixar', description: 'Não foi possível gerar o documento.', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!analysisResult) return;
    setIsDownloading(true);
    try {
      const blob = await generatePdfFromHtml('analysis-content', analysisResult.moduleLabel);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadPdf(blob, `analise-${analysisResult.moduleLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${dateStr}.pdf`);
      toast({ title: 'PDF baixado!', description: 'O arquivo foi salvo na sua pasta de downloads.' });
    } catch {
      toast({ title: 'Erro ao baixar PDF', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!analysisResult || !employee) return;
    setIsSaving(true);
    try {
      const pdfBlob = await generatePdfFromHtml('analysis-content', analysisResult.moduleLabel);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `${employee.id}/${analysisResult.module}-${dateStr}-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('market-analysis-pdfs')
        .upload(filename, pdfBlob, { contentType: 'application/pdf' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('market-analysis-pdfs')
        .getPublicUrl(filename);

      const pdfUrl = urlData.publicUrl;

      if (savedAnalysisId) {
        await supabase
          .from('market_analyses' as any)
          .update({ pdf_url: pdfUrl } as any)
          .eq('id', savedAnalysisId);
      } else if (formData) {
        const { data: saved, error } = await supabase
          .from('market_analyses' as any)
          .insert({
            tenant_id: employee.tenant_id,
            user_id: employee.id,
            module: analysisResult.module,
            module_label: analysisResult.moduleLabel,
            form_data: formData,
            result_markdown: analysisResult.markdown,
            chat_history: chatMessages,
            pdf_url: pdfUrl,
          } as any)
          .select()
          .single();
        if (error) throw error;
        setSavedAnalysisId((saved as any).id);
      }

      setIsSaved(true);
      toast({ title: 'Análise salva na biblioteca!', description: 'Você pode acessá-la a qualquer momento.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadSavedPdf = async (analysis: SavedAnalysis) => {
    const pdfUrl = (analysis as any).pdf_url;
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else {
      toast({ title: 'PDF não disponível', description: 'Abra a análise e salve na biblioteca primeiro.', variant: 'destructive' });
    }
  };

  const selectedModuleLabel =
    selectedModule === 'all'
      ? 'Análise Completa'
      : modules.find((m) => m.number === selectedModule)?.title ?? '';

  useEffect(() => {
    if (currentStep === 'loading' && formData && selectedModule) {
      setActiveLoadingStep(0);
      generateMutation.mutate(
        { module: selectedModule, formData },
        {
          onSuccess: (data) => {
            setAnalysisResult(data);
            setChatMessages([WELCOME_MESSAGE]);
            setCurrentStep('result');
            setIsSaved(false);
            if (employee) {
              saveMutation.mutate({
                tenant_id: employee.tenant_id,
                user_id: employee.id,
                module: data.module,
                module_label: data.moduleLabel,
                form_data: formData,
                result_markdown: data.markdown,
                chat_history: [],
              }, {
                onSuccess: (saved) => {
                  setSavedAnalysisId(saved.id);
                  toast({ title: 'Análise salva com sucesso!', description: 'Você pode acessá-la novamente a qualquer momento.' });
                },
              });
            }
          },
          onError: () => {
            toast({ title: 'Erro ao gerar análise', description: 'Tente novamente em alguns instantes.', variant: 'destructive' });
          },
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  useEffect(() => {
    if (currentStep !== 'loading') return;
    const interval = setInterval(() => {
      setActiveLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 4000);
    return () => clearInterval(interval);
  }, [currentStep]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, refineMutation.isPending]);

  const handleRetry = () => {
    generateMutation.reset();
    setCurrentStep('loading');
  };

  const handleBackToForm = () => {
    generateMutation.reset();
    setCurrentStep('form');
  };

  const handleSendChat = () => {
    const question = chatInput.trim();
    if (!question || !analysisResult) return;

    const userMsg: ChatMessage = { role: 'user', content: question };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');

    refineMutation.mutate(
      {
        currentMarkdown: analysisResult.markdown,
        question,
        chatHistory: updatedMessages.filter((m) => m !== WELCOME_MESSAGE),
      },
      {
        onSuccess: (data) => {
          const newMessages: ChatMessage[] = [
            ...updatedMessages,
            { role: 'assistant', content: data.response },
          ];
          setChatMessages(newMessages);
          if (savedAnalysisId) {
            updateMutation.mutate({ id: savedAnalysisId, chat_history: newMessages });
          }
        },
      }
    );
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  };

  // Build breadcrumbs
  const breadcrumbs = (() => {
    const crumbs: { label: string; href?: string }[] = [{ label: 'Marketing' }];
    if (currentStep === 'library') {
      crumbs.push({ label: 'Análise de Mercado' });
    } else {
      crumbs.push({ label: 'Análise de Mercado', href: '#library' });
      const stepLabels: Record<string, string> = {
        selection: 'Seleção',
        form: 'Formulário',
        loading: 'Gerando...',
        result: 'Resultado',
      };
      crumbs.push({ label: stepLabels[currentStep] || currentStep });
    }
    return crumbs;
  })();

  // Handle breadcrumb click for navigating back to library
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#library') {
        handleBackToLibrary();
        window.history.replaceState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actions for AppLayout header
  const headerActions = currentStep === 'library' ? (
    <Button className="gap-2" onClick={() => setCurrentStep('selection')}>
      <Plus className="h-4 w-4" />
      Nova Análise
    </Button>
  ) : undefined;

  return (
    <AppLayout
      title="Análise de Mercado"
      description="Acompanhe tendências e métricas de mercado"
      breadcrumbs={breadcrumbs}
      actions={headerActions}
    >
      {/* Exit form confirmation dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja sair? Os dados do formulário serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingExitAction(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              pendingExitAction?.();
              setPendingExitAction(null);
              setShowExitConfirm(false);
            }}>
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── STEP: LIBRARY ── */}
      {currentStep === 'library' && (
        <div className="space-y-6 transition-all duration-300 ease-in-out">
          {isLoadingAnalyses ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                      <Skeleton className="h-8 flex-1" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : !savedAnalyses?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground">Nenhuma análise salva</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Suas análises aparecerão aqui após serem salvas
              </p>
              <Button className="mt-6 gap-2" onClick={() => setCurrentStep('selection')}>
                <Plus className="h-4 w-4" />
                Criar primeira análise
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedAnalyses.map((analysis) => (
                <Card key={analysis.id} className="flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">{analysis.module}</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(analysis.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                    </div>
                    <CardTitle className="text-base mb-1">{analysis.module_label}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {analysis.result_markdown.replace(/[#*|]/g, '').slice(0, 150)}...
                    </p>
                    <div className="flex items-center gap-2 mt-4 pt-2 border-t">
                      <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => handleOpenSaved(analysis)}>
                        <Eye className="h-3.5 w-3.5" />
                        Abrir
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleDownloadSavedPdf(analysis)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A análise será permanentemente removida.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAnalysis(analysis.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP: SELECTION ── */}
      {currentStep === 'selection' && (
        <div className="space-y-6 transition-all duration-300 ease-in-out">
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
              Análise Estratégica Completa
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
        <div className="max-w-3xl mx-auto space-y-6 transition-all duration-300 ease-in-out">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{selectedModuleLabel}</h2>
            <p className="text-sm text-muted-foreground">Preencha o contexto do seu negócio para gerar a análise.</p>
          </div>

          {/* Context quality indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Qualidade do contexto:</span>
              <span className={`font-medium ${qualityInfo.className}`}>{qualityInfo.label} ({contextQuality}%)</span>
            </div>
            <Progress value={contextQuality} className="h-2" />
            {contextQuality < 50 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Contexto incompleto pode gerar análise genérica
              </p>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField control={form.control} name="product" render={({ field }) => {
                const len = field.value?.length ?? 0;
                const isWarn = len >= 5 && len < 10;
                return (
                  <FormItem>
                    <FormLabel>O que é o seu produto ou serviço?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva o que é, como funciona e qual problema resolve" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                    </FormControl>
                    {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                    <FormMessage />
                  </FormItem>
                );
              }} />

              <FormField control={form.control} name="targetCustomer" render={({ field }) => {
                const len = field.value?.length ?? 0;
                const isWarn = len >= 5 && len < 10;
                return (
                  <FormItem>
                    <FormLabel>Quem é o seu cliente-alvo?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Perfil, cargo, segmento, comportamento de compra" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                    </FormControl>
                    {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                    <FormMessage />
                  </FormItem>
                );
              }} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="market" render={({ field }) => {
                  const len = field.value?.length ?? 0;
                  const isWarn = len >= 3 && len < 5;
                  return (
                    <FormItem>
                      <FormLabel>Em qual mercado e região você atua?</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: SaaS B2B, Brasil e LATAM" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                      </FormControl>
                      {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                      <FormMessage />
                    </FormItem>
                  );
                }} />
                <FormField control={form.control} name="stage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qual o estágio atual do negócio?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {stageOptions.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="revenueModel" render={({ field }) => {
                const len = field.value?.length ?? 0;
                const isWarn = len >= 3 && len < 5;
                return (
                  <FormItem>
                    <FormLabel>Como você monetiza?</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Assinatura mensal, freemium, licença anual" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                    </FormControl>
                    {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                    <FormMessage />
                  </FormItem>
                );
              }} />

              <FormField control={form.control} name="differentials" render={({ field }) => {
                const len = field.value?.length ?? 0;
                const isWarn = len >= 5 && len < 10;
                return (
                  <FormItem>
                    <FormLabel>O que você acredita que diferencia seu produto hoje?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Pode ser uma hipótese ainda não validada" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                    </FormControl>
                    {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                    <FormMessage />
                  </FormItem>
                );
              }} />

              <FormField control={form.control} name="mainChallenge" render={({ field }) => {
                const len = field.value?.length ?? 0;
                const isWarn = len >= 5 && len < 10;
                return (
                  <FormItem>
                    <FormLabel>Qual é o maior desafio ou pergunta estratégica que você tem hoje?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="O que mais trava o crescimento ou validação" className={isWarn ? 'border-yellow-400 focus-visible:ring-yellow-400' : ''} {...field} />
                    </FormControl>
                    {isWarn && <p className="text-xs text-yellow-600 dark:text-yellow-400">Adicione mais detalhes para análise mais precisa</p>}
                    <FormMessage />
                  </FormItem>
                );
              }} />

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

      {/* ── STEP: LOADING ── */}
      {currentStep === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 transition-all duration-300 ease-in-out">
          {generateMutation.isError ? (
            <Card className="max-w-md w-full p-6">
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle>Não foi possível gerar a análise</AlertTitle>
                <AlertDescription>
                  {generateMutation.error?.message || 'Tente novamente em alguns instantes.'}
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleBackToForm}>
                  Voltar ao formulário
                </Button>
                <Button className="flex-1 gap-2" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Progress value={((activeLoadingStep + 1) / loadingSteps.length) * 100} className="w-full max-w-md" />
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Gerando {selectedModuleLabel}...</h2>
              </div>
              <div className="space-y-3 w-full max-w-md">
                {loadingSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isDone = idx < activeLoadingStep;
                  const isCurrent = idx === activeLoadingStep;
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCurrent ? 'bg-primary/10 text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
                      {isDone ? <Check className="h-5 w-5 text-primary shrink-0" /> : isCurrent ? <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" /> : <Icon className="h-5 w-5 shrink-0" />}
                      <span className="text-sm">{step.label}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                Análises complexas podem levar até 1 minuto. Não feche esta janela.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── STEP: RESULT ── */}
      {currentStep === 'result' && analysisResult && (
        <div className="flex gap-6 h-[calc(100vh-200px)] transition-all duration-300 ease-in-out">
          {/* Document Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground truncate">{analysisResult.moduleLabel}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {isSaved ? (
                  <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-600" disabled>
                    <Check className="h-4 w-4" />
                    Salvo ✓
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleSaveToLibrary}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar na Biblioteca
                  </Button>
                )}
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPdf} disabled={isDownloading}>
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadWord} disabled={isDownloading}>
                  <FileText className="h-4 w-4" />
                  Word
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleNewAnalysis}>
                  <RefreshCw className="h-4 w-4" />
                  Nova Análise
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-card rounded-lg shadow-sm border p-8">
              <div id="analysis-content" className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="w-full border-collapse border border-border text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border bg-muted px-3 py-2 text-left font-medium">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-3 py-2">{children}</td>
                    ),
                  }}
                >
                  {analysisResult.markdown}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Chat Panel */}
          <div className="w-[400px] flex flex-col border rounded-lg bg-card">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Refine sua análise</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Faça perguntas, peça ajustes ou aprofunde qualquer seção
              </p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))}

              {refineMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Pensando...
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="border-t p-4">
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="Peça um ajuste ou faça uma pergunta..."
                  className="min-h-[40px] max-h-[120px] resize-none text-sm"
                  disabled={refineMutation.isPending}
                  rows={1}
                />
                <Button
                  size="icon"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || refineMutation.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default MarketAnalysisPage;
