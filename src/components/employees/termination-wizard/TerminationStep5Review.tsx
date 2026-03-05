import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { TERMINATION_TYPE_LABELS, REASON_CATEGORY_LABELS } from '@/types/termination';
import { Employee } from '@/hooks/useEmployees';
import { TerminationWizardData } from './types';
import { calculateAutoCalcs } from './TerminationStep3Payroll';
import { DOCUMENT_CHECKLISTS } from './TerminationStep4Documents';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Props {
  data: TerminationWizardData;
  employee: Employee;
  confirmed: boolean;
  onConfirmedChange: (v: boolean) => void;
  skipNotice?: boolean;
}

const TerminationStep5Review = ({ data, employee, confirmed, onConfirmedChange, skipNotice }: Props) => {
  const contractType = employee.tipoContratacao || 'CLT';
  const checklist = DOCUMENT_CHECKLISTS[contractType] || DOCUMENT_CHECKLISTS.CLT;
  const missingRequiredDocs = checklist.filter(d => d.required && !data.document_checklist[d.key]);
  const hasMissingDocs = missingRequiredDocs.length > 0;
  const financials = useMemo(() => {
    const autoCalcs = calculateAutoCalcs(employee, data);
    let credits = 0;
    let debits = 0;

    autoCalcs.forEach(item => {
      if (item.isCredit) credits += item.value;
      else debits += item.value;
    });

    data.manual_adjustments.forEach(adj => {
      if (adj.isCredit) credits += adj.amount;
      else debits += adj.amount;
    });

    return { credits, debits, net: credits - debits };
  }, [data, employee]);

  const defaultAccordionValues = ['employee', 'dates', 'financial', 'docs'];
  if (!skipNotice) defaultAccordionValues.splice(2, 0, 'notice');

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={defaultAccordionValues} className="space-y-2">
        <AccordionItem value="employee" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Dados do Funcionário</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{employee.nome}</span></div>
              <div><span className="text-muted-foreground">Cargo:</span> <span className="font-medium">{employee.cargo}</span></div>
              <div><span className="text-muted-foreground">Admissão:</span> <span className="font-medium">{formatDate(employee.dataAdmissao)}</span></div>
              <div><span className="text-muted-foreground">Salário:</span> <span className="font-medium">{formatCurrency(employee.salarioMensal)}</span></div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="dates" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Datas e Tipo</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Comunicação:</span> <span className="font-medium">{formatDate(data.notification_date)}</span></div>
              <div><span className="text-muted-foreground">Desligamento:</span> <span className="font-medium">{formatDate(data.termination_date)}</span></div>
              <div><span className="text-muted-foreground">Tipo:</span> <Badge variant="outline">{TERMINATION_TYPE_LABELS[data.termination_type]}</Badge></div>
              <div><span className="text-muted-foreground">Categoria:</span> <span className="font-medium">{REASON_CATEGORY_LABELS[data.reason_category]}</span></div>
            </div>
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Motivo:</span>
              <p className="mt-1 text-foreground">{data.reason}</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {!skipNotice && (
          <AccordionItem value="notice" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-medium">Aviso Prévio</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Dias:</span> <span className="font-medium">{data.notice_period_days}</span></div>
                <div><span className="text-muted-foreground">Trabalhado:</span> <span className="font-medium">{data.notice_worked ? 'Sim' : 'Não'}</span></div>
                {!data.notice_worked && (
                  <div className="col-span-2"><span className="text-muted-foreground">Tipo:</span> <span className="font-medium">{data.notice_indemnified_by_company ? 'Indenizado pela empresa' : 'Descontado do funcionário'}</span></div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="financial" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Resumo Financeiro</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Créditos:</span><span className="font-semibold text-green-700">{formatCurrency(financials.credits)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Débitos:</span><span className="font-semibold text-red-700">{formatCurrency(financials.debits)}</span></div>
              <div className="flex justify-between border-t border-border pt-1"><span className="font-medium">Valor Líquido:</span><span className="font-bold text-primary">{formatCurrency(financials.net)}</span></div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="docs" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm font-medium">Documentos</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm text-muted-foreground">
              {data.uploaded_files.length > 0
                ? `${data.uploaded_files.length} arquivo(s) anexado(s)`
                : 'Nenhum documento anexado'}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasMissingDocs && (
        <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Documentos obrigatórios pendentes:</strong> {missingRequiredDocs.map(d => d.label).join(', ')}.
            O processo ficará com status <strong>"Aguardando Documentos"</strong> até que sejam anexados.
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="default" className="border-amber-300 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
          Após confirmar, o funcionário será marcado como "Em Desligamento" e o processo poderá ser acompanhado na área de Funcionários Desligados.
        </AlertDescription>
      </Alert>

      <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
        <Checkbox
          id="confirm-termination"
          checked={confirmed}
          onCheckedChange={v => onConfirmedChange(!!v)}
        />
        <Label htmlFor="confirm-termination" className="text-sm cursor-pointer leading-relaxed">
          Confirmo que as informações acima estão corretas e desejo iniciar o processo de desligamento de <strong>{employee.nome}</strong>.
        </Label>
      </div>
    </div>
  );
};

export default TerminationStep5Review;
