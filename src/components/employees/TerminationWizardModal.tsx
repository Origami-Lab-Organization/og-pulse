import { useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { useCreateTermination } from '@/hooks/useTerminations';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import TerminationStep1Info from './termination-wizard/TerminationStep1Info';
import TerminationStep2Notice from './termination-wizard/TerminationStep2Notice';
import TerminationStep3Payroll from './termination-wizard/TerminationStep3Payroll';
import TerminationStep4Documents from './termination-wizard/TerminationStep4Documents';
import TerminationStep5Review from './termination-wizard/TerminationStep5Review';
import { TerminationWizardData, getDefaultWizardData } from './termination-wizard/types';

interface TerminationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess?: (terminationId: string) => void;
}

const STEPS = [
  'Informações',
  'Aviso Prévio',
  'Folha de Pgto',
  'Documentos',
  'Revisão',
];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  Estágio: 'Estágio',
  Temporário: 'Temporário',
  estagio: 'Estágio',
  temporario: 'Temporário',
};

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  CLT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PJ: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Estágio: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  estagio: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  Temporário: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  temporario: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

function getTimeSince(dateStr: string): string {
  const start = parseDateString(dateStr);
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} ${months > 1 ? 'meses' : 'mês'}`);
  return parts.length > 0 ? parts.join(' e ') : 'menos de 1 mês';
}

const TerminationWizardModal = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: TerminationWizardModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<TerminationWizardData>(getDefaultWizardData());
  const [confirmed, setConfirmed] = useState(false);
  const createTermination = useCreateTermination();

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    setWizardData(getDefaultWizardData());
    setConfirmed(false);
    onClose();
  }, [onClose]);

  const updateData = useCallback((partial: Partial<TerminationWizardData>) => {
    setWizardData(prev => ({ ...prev, ...partial }));
  }, []);

  const canAdvance = useMemo(() => {
    if (currentStep === 0) {
      return !!(wizardData.termination_date && wizardData.termination_type && wizardData.reason && wizardData.reason.length >= 20);
    }
    if (currentStep === 4) return confirmed;
    return true;
  }, [currentStep, wizardData, confirmed]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!employee) return;
    try {
      const result = await createTermination.mutateAsync({
        employee_id: employee.id,
        termination_date: wizardData.termination_date,
        notification_date: wizardData.notification_date || null,
        termination_type: wizardData.termination_type,
        reason: wizardData.reason,
        reason_category: wizardData.reason_category,
        notice_period_days: wizardData.notice_period_days,
        notice_worked: wizardData.notice_worked,
        exit_interview_completed: false,
        exit_interview_notes: null,
        status: 'pending',
      });
      onSuccess?.(result.id);
      handleClose();
    } catch {
      // error handled by mutation
    }
  };

  if (!employee) return null;

  const initials = employee.nome
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="termination-wizard-desc">
        <DialogHeader>
          <DialogTitle>Desligamento de Funcionário</DialogTitle>
          <p id="termination-wizard-desc" className="sr-only">Wizard de desligamento de funcionário</p>
        </DialogHeader>

        {/* Employee Card */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee.fotoUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-semibold text-foreground truncate">{employee.nome}</p>
                <p className="text-sm text-muted-foreground">{employee.cargo}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Admitido em {formatDate(employee.dataAdmissao)} ({getTimeSince(employee.dataAdmissao)})</span>
                  <span>•</span>
                  <Badge variant="outline" className={CONTRACT_TYPE_COLORS[employee.tipoContratacao] || ''}>
                    {CONTRACT_TYPE_LABELS[employee.tipoContratacao] || employee.tipoContratacao}
                  </Badge>
                  <span>•</span>
                  <span>{formatCurrency(employee.salarioMensal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stepper */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0
                  ${i < currentStep ? 'bg-primary text-primary-foreground' : ''}
                  ${i === currentStep ? 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2' : ''}
                  ${i > currentStep ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap hidden sm:inline ${i === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStep === 0 && (
            <TerminationStep1Info
              data={wizardData}
              onChange={updateData}
              contractType={employee.tipoContratacao}
            />
          )}
          {currentStep === 1 && (
            <TerminationStep2Notice
              data={wizardData}
              onChange={updateData}
              admissionDate={employee.dataAdmissao}
              salary={employee.salarioMensal}
            />
          )}
          {currentStep === 2 && (
            <TerminationStep3Payroll
              data={wizardData}
              onChange={updateData}
              employee={employee}
            />
          )}
          {currentStep === 3 && (
            <TerminationStep4Documents
              data={wizardData}
              onChange={updateData}
            />
          )}
          {currentStep === 4 && (
            <TerminationStep5Review
              data={wizardData}
              employee={employee}
              confirmed={confirmed}
              onConfirmedChange={setConfirmed}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose} size="sm">
              Cancelar
            </Button>
          </div>
          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 && (
              <Button onClick={handleNext} disabled={!canAdvance} size="sm">
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {currentStep === STEPS.length - 1 && (
              <Button
                onClick={handleSubmit}
                disabled={!confirmed || createTermination.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                size="sm"
              >
                {createTermination.isPending ? 'Salvando...' : 'Confirmar Desligamento'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TerminationWizardModal;
