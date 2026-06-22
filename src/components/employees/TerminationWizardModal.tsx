import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { useCreateTermination } from '@/hooks/useTerminations';
import { terminationService } from '@/services/terminationService';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import TerminationStep1Info from './termination-wizard/TerminationStep1Info';
import TerminationStep2Notice from './termination-wizard/TerminationStep2Notice';
import TerminationStep3Payroll, { calculateAutoCalcs } from './termination-wizard/TerminationStep3Payroll';
import TerminationStep4Documents from './termination-wizard/TerminationStep4Documents';
import { DOCUMENT_CHECKLISTS } from './termination-wizard/TerminationStep4Documents';
import TerminationStep5Review from './termination-wizard/TerminationStep5Review';
import { TerminationWizardData, getDefaultWizardData } from './termination-wizard/types';

interface TerminationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess?: (terminationId: string) => void;
}

const ALL_STEPS = [
  { key: 'info', label: 'Informações' },
  { key: 'notice', label: 'Aviso Prévio' },
  { key: 'payroll', label: 'Folha de Pgto' },
  { key: 'docs', label: 'Documentos' },
  { key: 'review', label: 'Revisão' },
];

const CONTRACT_TYPES_WITHOUT_NOTICE = ['ESTAGIO', 'PJ', 'SOCIO'];

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  ESTAGIO: 'Estágio',
  SOCIO: 'Sócio',
  MENOR_APRENDIZ: 'Menor Aprendiz',
};

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  CLT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PJ: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ESTAGIO: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SOCIO: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  MENOR_APRENDIZ: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
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
  const [showErrors, setShowErrors] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const createTermination = useCreateTermination();

  const contractType = employee?.tipoContratacao || 'CLT';
  const skipNotice = CONTRACT_TYPES_WITHOUT_NOTICE.includes(contractType);

  const steps = useMemo(() => {
    const filtered = skipNotice ? ALL_STEPS.filter(s => s.key !== 'notice') : ALL_STEPS;
    if (contractType === 'PJ') {
      return filtered.map(s => s.key === 'payroll' ? { ...s, label: 'Acerto' } : s);
    }
    return filtered;
  }, [skipNotice, contractType]);

  // Initialize termination_type via useEffect when wizard opens

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    setWizardData(getDefaultWizardData());
    setConfirmed(false);
    setShowErrors(false);
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen && employee) {
      const ct = employee.tipoContratacao || 'CLT';
      const defType = ct === 'ESTAGIO' ? 'internship_end' : ct === 'PJ' ? 'contract_end' : 'voluntary';
      setWizardData(prev => ({ ...prev, termination_type: defType }));
    }
  }, [isOpen, employee]);

  const handleRequestClose = useCallback(() => {
    const hasData = currentStep > 0 || wizardData.reason.length > 0 || wizardData.termination_date !== '';
    if (hasData) {
      setShowExitConfirm(true);
    } else {
      handleClose();
    }
  }, [currentStep, wizardData, handleClose]);

  const updateData = useCallback((partial: Partial<TerminationWizardData>) => {
    setWizardData(prev => ({ ...prev, ...partial }));
  }, []);

  const handleNext = () => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'info') {
      const isValid = !!(wizardData.termination_date && wizardData.termination_type && wizardData.reason && wizardData.reason.length >= 20);
      if (!isValid) {
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!employee) return;
    try {
      // Check if mandatory docs are missing
      const docChecklist = DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
      const hasMissingDocs = docChecklist.some(d => d.required && !wizardData.document_checklist[d.key]);
      const status = hasMissingDocs ? 'awaiting_documents' : 'pending';

      const result = await createTermination.mutateAsync({
        employee_id: employee.id,
        termination_date: wizardData.termination_date,
        notification_date: wizardData.notification_date || null,
        termination_type: wizardData.termination_type,
        reason: wizardData.reason,
        reason_category: wizardData.reason_category,
        notice_period_days: skipNotice ? 0 : wizardData.notice_period_days,
        notice_worked: skipNotice ? false : wizardData.notice_worked,
        exit_interview_completed: wizardData.exit_interview_completed,
        exit_interview_notes: wizardData.exit_interview_notes || null,
        is_just_cause: wizardData.is_just_cause,
        status,
      });

      // Build all adjustments for JSONB persistence
      const autoCalcs = calculateAutoCalcs(employee, wizardData);
      
      const allAdjustments = [
        ...autoCalcs.map(item => ({
          desc: item.desc,
          value: Math.round(item.value * 100) / 100,
          isCredit: item.isCredit,
          type: 'auto',
        })),
        ...wizardData.manual_adjustments.map(adj => ({
          desc: adj.description || adj.type,
          value: Math.round(adj.amount * 100) / 100,
          isCredit: adj.isCredit,
          type: 'manual',
          adjustmentType: adj.type,
        })),
      ];

      // Save to JSONB column (primary source of truth)
      try {
        await terminationService.update(result.id, {
          final_payroll_adjustments: allAdjustments,
        } as any);
      } catch (e) {
        console.error('Falha ao salvar ajustes no JSON:', e);
      }

      // Best-effort: also try saving to payroll_adjustments table
      const adjustmentTypeMap: Record<string, string> = {
        'Saldo de salário': 'salary_proportional',
        'Saldo de bolsa-auxílio': 'salary_proportional',
        'Pró-labore proporcional': 'salary_proportional',
        'Férias proporcionais': 'vacation',
        '13º proporcional': 'thirteenth_salary',
        'Multa FGTS': 'fgts_fine',
        'FGTS acumulado': 'fgts',
        'Aviso prévio': 'other',
        'Recesso remunerado': 'vacation',
      };

      const getAdjType = (desc: string): string => {
        for (const [key, type] of Object.entries(adjustmentTypeMap)) {
          if (desc.includes(key)) return type;
        }
        return 'other';
      };

      const adjustmentPromises = autoCalcs.map(item =>
        terminationService.addPayrollAdjustment({
          termination_id: result.id,
          adjustment_type: getAdjType(item.desc) as any,
          description: item.desc,
          amount: Math.round(item.value * 100) / 100,
          is_credit: item.isCredit,
        }).catch(() => {})
      );

      wizardData.manual_adjustments.forEach(adj => {
        adjustmentPromises.push(
          terminationService.addPayrollAdjustment({
            termination_id: result.id,
            adjustment_type: adj.type as any,
            description: adj.description,
            amount: Math.round(adj.amount * 100) / 100,
            is_credit: adj.isCredit,
          }).catch(() => {})
        );
      });

      await Promise.all(adjustmentPromises);

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

  const currentStepKey = steps[currentStep]?.key;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => { if (!open) handleRequestClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby="termination-wizard-desc" onPointerDownOutside={e => { e.preventDefault(); handleRequestClose(); }}>
        <DialogHeader>
          <DialogTitle>{contractType === 'PJ' ? 'Rescisão de Contrato PJ' : 'Desligamento de Funcionário'}</DialogTitle>
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
                  <span>{contractType === 'PJ' ? 'Contratado desde' : 'Admitido em'} {formatDate(employee.dataAdmissao)} ({getTimeSince(employee.dataAdmissao)})</span>
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

        {/* Stepper - mobile: text indicator, desktop: full stepper */}
        <div className="sm:hidden text-center">
          <span className="text-sm font-medium text-foreground">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          <span className="text-sm text-muted-foreground ml-1">— {steps[currentStep]?.label}</span>
        </div>

        <div className="hidden sm:flex items-center justify-center gap-2 py-1">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0 transition-colors
                  ${i < currentStep ? 'bg-primary text-primary-foreground' : ''}
                  ${i === currentStep ? 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2' : ''}
                  ${i > currentStep ? 'bg-muted text-muted-foreground' : ''}
                `}
              >
                {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`text-xs whitespace-nowrap ${i === currentStep ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border shrink-0" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {currentStepKey === 'info' && (
            <TerminationStep1Info
              data={wizardData}
              onChange={updateData}
              contractType={employee.tipoContratacao}
              showErrors={showErrors}
            />
          )}
          {currentStepKey === 'notice' && (
            <TerminationStep2Notice
              data={wizardData}
              onChange={updateData}
              admissionDate={employee.dataAdmissao}
              salary={employee.salarioMensal}
            />
          )}
          {currentStepKey === 'payroll' && (
            <TerminationStep3Payroll
              data={wizardData}
              onChange={updateData}
              employee={employee}
            />
          )}
          {currentStepKey === 'docs' && (
            <TerminationStep4Documents
              data={wizardData}
              onChange={updateData}
              contractType={contractType}
            />
          )}
          {currentStepKey === 'review' && (
            <TerminationStep5Review
              data={wizardData}
              employee={employee}
              confirmed={confirmed}
              onConfirmedChange={setConfirmed}
              skipNotice={skipNotice}
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
          </div>
          <div className="flex gap-2">
            {!isLastStep && (
              <Button onClick={handleNext} size="sm">
                Próximo <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {isLastStep && (
              <Button
                onClick={handleSubmit}
                disabled={!confirmed || createTermination.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                size="sm"
              >
                {createTermination.isPending ? 'Salvando...' : contractType === 'PJ' ? 'Confirmar Rescisão' : 'Confirmar Desligamento'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{contractType === 'PJ' ? 'Sair da rescisão?' : 'Sair do desligamento?'}</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja sair? Os dados preenchidos serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction onClick={handleClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Sair e descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default TerminationWizardModal;
