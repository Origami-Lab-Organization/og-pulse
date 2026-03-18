import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardStep {
  id: number;
  title: string;
}

interface BudgetWizardFooterProps {
  currentStep: number;
  totalSteps: number;
  wizardSteps: WizardStep[];
  isSubmitting: boolean;
  isSaveDisabled?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function BudgetWizardFooter({
  currentStep,
  totalSteps,
  wizardSteps,
  isSubmitting,
  isSaveDisabled,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
}: BudgetWizardFooterProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Stepper — left side */}
        <div className="flex items-center gap-1 shrink-0">
          {wizardSteps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors',
                    currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : currentStep > step.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {currentStep > step.id ? <Check className="h-3 w-3" /> : step.id}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:inline whitespace-nowrap',
                    currentStep === step.id ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < wizardSteps.length - 1 && (
                <div
                  className={cn(
                    'h-px w-5 mx-0.5',
                    currentStep > step.id ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Buttons — right side */}
        <div className="flex items-center gap-2">
          {currentStep === 1 ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onPrevious}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Voltar
            </Button>
          )}

          {currentStep < totalSteps ? (
            <Button type="button" size="sm" onClick={onNext}>
              Próximo
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={onSubmit} disabled={isSubmitting || isSaveDisabled}>
              {isSubmitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              <Save className="mr-1.5 h-3.5 w-3.5" />
              Salvar orçamento
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
