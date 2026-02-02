import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';

interface BudgetWizardFooterProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function BudgetWizardFooter({
  currentStep,
  totalSteps,
  isSubmitting,
  onPrevious,
  onNext,
  onCancel,
  onSubmit,
}: BudgetWizardFooterProps) {
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  return (
    <div 
      className={cn(
        "fixed bottom-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3 transition-[left] duration-200 ease-linear",
        isCollapsed ? "left-[3rem]" : "left-[16rem]"
      )}
    >
      <div className="max-w-5xl mx-auto flex justify-between gap-2">
        {currentStep === 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
        )}

        {currentStep < totalSteps ? (
          <Button type="button" onClick={onNext}>
            Próximo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Criar Orçamento
          </Button>
        )}
      </div>
    </div>
  );
}
