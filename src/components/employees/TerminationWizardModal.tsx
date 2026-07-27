import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate, parseDateString } from '@/lib/formatters';
import { Employee } from '@/hooks/useEmployees';
import { useCreateTermination } from '@/hooks/useTerminations';
import { terminationService } from '@/services/terminationService';
import TerminationStep1Info from './termination-wizard/TerminationStep1Info';
import TerminationStep2Notice from './termination-wizard/TerminationStep2Notice';
import TerminationStep3Payroll, { calculateAutoCalcs } from './termination-wizard/TerminationStep3Payroll';
import TerminationStep4Documents, { DOCUMENT_CHECKLISTS } from './termination-wizard/TerminationStep4Documents';
import { TerminationWizardData, getDefaultWizardData } from './termination-wizard/types';

interface TerminationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSuccess?: (terminationId: string) => void;
}

const STEPS = [
  { key: 'details', label: 'Detalhes' },
  { key: 'payroll', label: 'Folha de Pgto' },
  { key: 'docs', label: 'Documentos' },
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

const TerminationWizardModal = ({ isOpen, onClose, employee, onSuccess }: TerminationWizardModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<TerminationWizardData>(getDefaultWizardData());
  const [confirmed, setConfirmed] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const createTermination = useCreateTermination();

  const contractType = employee?.tipoContratacao || 'CLT';
  const skipNotice = CONTRACT_TYPES_WITHOUT_NOTICE.includes(contractType);

  const steps = useMemo(() => {
    if (contractType === 'PJ') {
      return STEPS.map((s) => (s.key === 'payroll' ? { ...s, label: 'Acerto' } : s));
    }
    return STEPS;
  }, [contractType]);

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
      setWizardData((prev) => ({ ...prev, termination_type: defType }));
    }
  }, [isOpen, employee]);

  // Só marca "override manual" quando o Tipo de Desligamento muda por uma ação do usuário
  // (via `updateData`, usado por todos os `onChange` dos passos) — a pré-seleção automática
  // abaixo chama `setWizardData` direto, sem passar por aqui.
  const manualTypeOverrideRef = useRef(false);

  const updateData = useCallback((partial: Partial<TerminationWizardData>) => {
    if (partial.termination_type !== undefined) manualTypeOverrideRef.current = true;
    setWizardData((prev) => ({ ...prev, ...partial }));
  }, []);

  // Pré-seleciona "Fim Antecipado de Contrato" quando a data de desligamento cai antes da
  // data prevista de término do contrato de experiência — e reverte se a data voltar a ficar
  // depois. Para de agir assim que o usuário escolher o Tipo de Desligamento manualmente.
  useEffect(() => {
    if (manualTypeOverrideRef.current) return;
    if (!employee?.contratoExperiencia || !wizardData.termination_date) return;
    const endDateStr = employee.experienciaPeriodo2Fim ?? employee.experienciaPeriodo1Fim;
    if (!endDateStr) return;
    const isEarly = wizardData.termination_date < endDateStr;

    if (isEarly && wizardData.termination_type !== 'early_contract_termination') {
      setWizardData((prev) => ({ ...prev, termination_type: 'early_contract_termination' }));
    } else if (!isEarly && wizardData.termination_type === 'early_contract_termination') {
      setWizardData((prev) => ({ ...prev, termination_type: 'voluntary' }));
    }
  }, [employee, wizardData.termination_date, wizardData.termination_type]);

  const handleRequestClose = useCallback(() => {
    const hasData = currentStep > 0 || wizardData.reason.length > 0 || wizardData.termination_date !== '';
    if (hasData) {
      setShowExitConfirm(true);
    } else {
      handleClose();
    }
  }, [currentStep, wizardData, handleClose]);

  const handleTabClick = (key: string) => {
    const index = steps.findIndex((s) => s.key === key);
    if (index >= 0) {
      setShowErrors(false);
      setCurrentStep(index);
    }
  };

  const handleNext = () => {
    const stepKey = steps[currentStep]?.key;
    if (stepKey === 'details') {
      const isValid = !!(
        wizardData.termination_date &&
        wizardData.termination_type &&
        wizardData.reason &&
        wizardData.reason.length >= 20 &&
        (wizardData.termination_type !== 'early_contract_termination' || wizardData.early_termination_initiated_by)
      );
      if (!isValid) {
        setShowErrors(true);
        return;
      }
    }
    setShowErrors(false);
    if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!employee) return;
    try {
      const docChecklist = DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
      const hasMissingDocs = docChecklist.some((d) => d.required && !wizardData.document_files[d.key]);
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

      const autoCalcs = calculateAutoCalcs(employee, wizardData);

      const allAdjustments = [
        ...autoCalcs.map((item) => ({
          desc: item.desc,
          value: Math.round(item.value * 100) / 100,
          isCredit: item.isCredit,
          type: 'auto',
        })),
        ...wizardData.manual_adjustments.map((adj) => ({
          desc: adj.description || adj.type,
          value: Math.round(adj.amount * 100) / 100,
          isCredit: adj.isCredit,
          type: 'manual',
          adjustmentType: adj.type,
        })),
      ];

      try {
        await terminationService.update(result.id, {
          final_payroll_adjustments: allAdjustments,
        } as any);
      } catch (e) {
        console.error('Falha ao salvar ajustes no JSON:', e);
      }

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

      const adjustmentPromises = autoCalcs.map((item) =>
        terminationService
          .addPayrollAdjustment({
            termination_id: result.id,
            adjustment_type: getAdjType(item.desc) as any,
            description: item.desc,
            amount: Math.round(item.value * 100) / 100,
            is_credit: item.isCredit,
          })
          .catch(() => {}),
      );

      wizardData.manual_adjustments.forEach((adj) => {
        adjustmentPromises.push(
          terminationService
            .addPayrollAdjustment({
              termination_id: result.id,
              adjustment_type: adj.type as any,
              description: adj.description,
              amount: Math.round(adj.amount * 100) / 100,
              is_credit: adj.isCredit,
            })
            .catch(() => {}),
        );
      });

      await Promise.all(adjustmentPromises);

      onSuccess?.(result.id);
      handleClose();
    } catch {
      // erro tratado pela mutation
    }
  };

  if (!employee) return null;

  const initials = employee.nome
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentStepKey = steps[currentStep]?.key;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleRequestClose(); }}>
        <DialogContent
          className="max-w-5xl max-h-[90vh] overflow-y-auto"
          aria-describedby="termination-wizard-desc"
          onPointerDownOutside={(e) => { e.preventDefault(); handleRequestClose(); }}
        >
          <DialogHeader>
            <DialogTitle>{contractType === 'PJ' ? 'Rescisão de Contrato PJ' : 'Desligamento de Funcionário'}</DialogTitle>
            <p id="termination-wizard-desc" className="sr-only">Wizard de desligamento de funcionário</p>
          </DialogHeader>

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
                    <span>
                      {contractType === 'PJ' ? 'Contratado desde' : 'Admitido em'} {formatDate(employee.dataAdmissao)} (
                      {getTimeSince(employee.dataAdmissao)})
                    </span>
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

          <Tabs value={currentStepKey} onValueChange={handleTabClick}>
            <TabsList className="grid w-full grid-cols-3">
              {steps.map((step) => (
                <TabsTrigger key={step.key} value={step.key} className="text-xs sm:text-sm">
                  {step.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="min-h-[300px]">
            {currentStepKey === 'details' && (
              <div className="space-y-6">
                <TerminationStep1Info data={wizardData} onChange={updateData} contractType={employee.tipoContratacao} showErrors={showErrors} />
                {!skipNotice && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-foreground">Aviso Prévio</h4>
                      <TerminationStep2Notice data={wizardData} onChange={updateData} admissionDate={employee.dataAdmissao} salary={employee.salarioMensal} />
                    </div>
                  </>
                )}
              </div>
            )}
            {currentStepKey === 'payroll' && <TerminationStep3Payroll data={wizardData} onChange={updateData} employee={employee} />}
            {currentStepKey === 'docs' && (
              <div className="space-y-4">
                <TerminationStep4Documents data={wizardData} onChange={updateData} contractType={contractType} />
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                  <Checkbox id="confirm-termination" checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
                  <Label htmlFor="confirm-termination" className="text-sm cursor-pointer leading-relaxed">
                    Confirmo que as informações acima estão corretas e desejo{' '}
                    {contractType === 'PJ' ? (
                      <>confirmar a rescisão do contrato com <strong>{employee.nome}</strong>.</>
                    ) : (
                      <>iniciar o processo de desligamento de <strong>{employee.nome}</strong>.</>
                    )}
                  </Label>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmit}
                    disabled={!confirmed || createTermination.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {createTermination.isPending ? 'Salvando...' : contractType === 'PJ' ? 'Confirmar Rescisão' : 'Confirmar Desligamento'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} size="sm">
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
            <div>
              {!isLastStep && (
                <Button onClick={handleNext} size="sm">
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
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
            <AlertDialogDescription>Tem certeza que deseja sair? Os dados preenchidos serão perdidos.</AlertDialogDescription>
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
