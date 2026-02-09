import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalculatorInputs, parseCurrencyInput } from '@/components/calculator/CalculatorInputs';
import { CalculatorResults } from '@/components/calculator/CalculatorResults';
import { calculateEmployeeCost } from '@/lib/employeeCostCalculator';
import { calculateNetSalary } from '@/lib/netSalaryCalculator';
import { Calculator } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EmployeeCalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_JORNADA = 168;

export default function EmployeeCalculatorDialog({ open, onOpenChange }: EmployeeCalculatorDialogProps) {
  const [salarioBruto, setSalarioBruto] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [jornadaMensal, setJornadaMensal] = useState(DEFAULT_JORNADA.toString());
  const [dependentes, setDependentes] = useState('0');
  const [pjBase, setPjBase] = useState<'total_cost' | 'gross_salary'>('total_cost');

  const salarioBrutoNum = parseCurrencyInput(salarioBruto);
  const beneficiosNum = parseCurrencyInput(beneficios);
  const jornadaNum = parseInt(jornadaMensal) || DEFAULT_JORNADA;
  const dependentesNum = parseInt(dependentes) || 0;

  const cltCost = useMemo(() => {
    return calculateEmployeeCost({
      tipoContratacao: 'CLT',
      salarioBruto: salarioBrutoNum,
      bolsaAuxilio: 0,
      valorContratoPj: 0,
      proLabore: 0,
      dividendos: 0,
      benefitsTotalMonthly: beneficiosNum,
      toolsTotalMonthly: 0,
    });
  }, [salarioBrutoNum, beneficiosNum]);

  const cltNetSalary = useMemo(() => {
    return calculateNetSalary(salarioBrutoNum, dependentesNum);
  }, [salarioBrutoNum, dependentesNum]);

  const hasValidInput = salarioBrutoNum >= 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora de Custos
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Simule os custos de contratação CLT vs PJ (Simples Nacional)
          </p>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 max-h-[calc(90vh-100px)]">
          <div className="space-y-6 pt-4">
            <CalculatorInputs
              salarioBruto={salarioBruto}
              setSalarioBruto={setSalarioBruto}
              beneficios={beneficios}
              setBeneficios={setBeneficios}
              jornadaMensal={jornadaMensal}
              setJornadaMensal={setJornadaMensal}
              dependentes={dependentes}
              setDependentes={setDependentes}
            />

            {hasValidInput ? (
              <CalculatorResults
                cltCost={cltCost}
                cltNetSalary={cltNetSalary}
                jornadaMensal={jornadaNum}
                pjBase={pjBase}
                setPjBase={setPjBase}
              />
            ) : (
              <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Informe o salário bruto CLT para ver os resultados</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
