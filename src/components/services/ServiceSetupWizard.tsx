import { useState, useCallback, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WizardStep1Line } from './wizard/WizardStep1Line';
import { WizardStep2Service } from './wizard/WizardStep2Service';
import { WizardStep3Model } from './wizard/WizardStep3Model';
import { WizardLineData, WizardServiceData, WizardModelData, WizardDraft } from './wizard/types';
import { useCreateServiceLine } from '@/hooks/useServiceLines';
import { useCreateService } from '@/hooks/useServices';
import { useCreateServiceRevenueModel } from '@/hooks/useServiceRevenueModels';
import { REVENUE_MODEL_LABELS, isPercentModel } from '@/types/serviceRevenueModel';

const STEPS = [
  { key: 1 as const, label: 'Linha' },
  { key: 2 as const, label: 'Serviço' },
  { key: 3 as const, label: 'Modelo' },
];

interface ServiceSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDraft?: WizardDraft | null;
  onDraftSaved?: (draft: WizardDraft) => void;
  onDraftAbandoned?: () => void;
  onCompleted?: () => void;
}

export function ServiceSetupWizard({
  open,
  onOpenChange,
  initialDraft,
  onDraftSaved,
  onDraftAbandoned,
  onCompleted,
}: ServiceSetupWizardProps) {
  const navigate = useNavigate();
  const createLine = useCreateServiceLine();
  const createService = useCreateService();
  const createModel = useCreateServiceRevenueModel();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lineData, setLineData] = useState<WizardLineData | null>(null);
  const [serviceData, setServiceData] = useState<WizardServiceData | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const isCreating = createLine.isPending || createService.isPending || createModel.isPending;
  // "Has progress" = user has submitted at least step 1 (lineData captured, now on step 2+)
  const hasProgress = step > 1;

  // Initialize/reset state every time the dialog opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    if (initialDraft) {
      setStep(initialDraft.step);
      setLineData(initialDraft.lineData);
      setServiceData(initialDraft.serviceData);
    } else {
      setStep(1);
      setLineData(null);
      setServiceData(null);
    }
    setShowAbandonConfirm(false);
  }, [open]); // intentionally omits initialDraft — only re-initialize when open toggles

  const doClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setLineData(null);
      setServiceData(null);
      setShowAbandonConfirm(false);
    }, 300);
  }, [onOpenChange]);

  const handleTryClose = useCallback(() => {
    if (isCreating) return;
    if (hasProgress) {
      setShowAbandonConfirm(true);
    } else {
      doClose();
    }
  }, [isCreating, hasProgress, doClose]);

  const handleSaveDraft = () => {
    const draft: WizardDraft = {
      step,
      lineData,
      serviceData,
      savedAt: new Date().toISOString(),
    };
    onDraftSaved?.(draft);
    setShowAbandonConfirm(false);
    doClose();
  };

  const handleAbandon = () => {
    onDraftAbandoned?.();
    setShowAbandonConfirm(false);
    doClose();
  };

  const doCreate = useCallback(
    async (svc: WizardServiceData, mdl: WizardModelData) => {
      if (!lineData) return;
      try {
        const line = await createLine.mutateAsync(lineData);
        const service = await createService.mutateAsync({
          serviceLineId: line.id,
          name: svc.name,
          description: svc.description,
        });
        const billingUnit = isPercentModel(mdl.modelType)
          ? '%'
          : mdl.modelType === 'recurring'
          ? (mdl.period ?? 'monthly')
          : 'R$';
        await createModel.mutateAsync({
          serviceId: service.id,
          name: REVENUE_MODEL_LABELS[mdl.modelType],
          modelType: mdl.modelType,
          baseValue: null,
          billingUnit,
        });
        onCompleted?.();
        navigate(`/comercial/servicos/${line.id}`);
        doClose();
      } catch {
        // each hook shows its own error toast
      }
    },
    [lineData, createLine, createService, createModel, navigate, doClose, onCompleted]
  );

  const handleStep1 = (data: WizardLineData) => {
    setLineData(data);
    setStep(2);
  };

  const handleStep2 = (data: WizardServiceData) => {
    setServiceData(data);
    setStep(3);
  };

  const handleStep3 = (mdl: WizardModelData) => {
    if (!serviceData) return;
    doCreate(serviceData, mdl);
  };

  const stepTitle =
    step === 1
      ? 'Nova Linha de Serviço'
      : step === 2
      ? 'Adicionar Serviço'
      : 'Modelo de Cobrança';

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleTryClose();
        }}
      >
        <DialogContent
          className="sm:max-w-3xl"
          onInteractOutside={(e) => {
            e.preventDefault();
            handleTryClose();
          }}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            handleTryClose();
          }}
        >
          <DialogHeader>
            <DialogTitle>{stepTitle}</DialogTitle>
          </DialogHeader>

          {/* Progress stepper */}
          <div className="flex items-start mb-6">
            {STEPS.map((s, i) => (
              <Fragment key={s.key}>
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                      step > s.key
                        ? 'bg-primary border-primary text-primary-foreground'
                        : step === s.key
                        ? 'border-primary text-primary bg-background'
                        : 'border-muted-foreground/30 text-muted-foreground/30 bg-background'
                    )}
                  >
                    {step > s.key ? <Check className="h-4 w-4" /> : s.key}
                  </div>
                  <span
                    className={cn(
                      'text-sm mt-2 text-center leading-tight max-w-[80px]',
                      step === s.key ? 'text-foreground font-medium' : 'text-muted-foreground/60'
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn('flex-1 h-px mt-4 mx-3', step > s.key ? 'bg-primary' : 'bg-border')}
                  />
                )}
              </Fragment>
            ))}
          </div>

          {/* Step content */}
          {step === 1 && (
            <WizardStep1Line
              initial={lineData ?? undefined}
              onContinue={handleStep1}
              onCancel={handleTryClose}
            />
          )}
          {step === 2 && lineData && (
            <WizardStep2Service
              lineName={lineData.name}
              initial={serviceData ?? undefined}
              onContinue={handleStep2}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && serviceData && (
            <WizardStep3Model
              serviceName={serviceData.name}
              onContinue={handleStep3}
              onBack={() => setStep(2)}
              onSaveDraft={handleSaveDraft}
              isLoading={isCreating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Abandon confirmation — appears over the wizard */}
      <AlertDialog open={showAbandonConfirm} onOpenChange={setShowAbandonConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar configuração?</AlertDialogTitle>
            <AlertDialogDescription>
              Você preencheu informações que ainda não foram publicadas. Salve como rascunho para
              continuar depois, ou abandone e perca o progresso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="ghost"
              className="text-muted-foreground sm:mr-auto"
              onClick={handleAbandon}
            >
              Abandonar
            </Button>
            <Button variant="outline" onClick={handleSaveDraft}>
              Salvar rascunho
            </Button>
            <Button onClick={() => setShowAbandonConfirm(false)}>
              Continuar configuração
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
