import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalculatorInputs, parseCurrencyInput } from '@/components/calculator/CalculatorInputs';
import { CalculatorResults } from '@/components/calculator/CalculatorResults';
import { calculateEmployeeCost } from '@/lib/employeeCostCalculator';
import { calculateNetSalary } from '@/lib/netSalaryCalculator';
import { Calculator } from 'lucide-react';

const DEFAULT_JORNADA_DIARIA = 8;

export default function EmployeeCalculator() {
  const [salarioBruto, setSalarioBruto] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [jornadaDiaria, setJornadaDiaria] = useState(DEFAULT_JORNADA_DIARIA.toString());
  const [dependentes, setDependentes] = useState('0');
  const [pjBase, setPjBase] = useState<'total_cost' | 'gross_salary'>('total_cost');

  const salarioBrutoNum = parseCurrencyInput(salarioBruto);
  const beneficiosNum = parseCurrencyInput(beneficios);
  const jornadaDiariaNum = parseInt(jornadaDiaria) || DEFAULT_JORNADA_DIARIA;
  const jornadaMensalNum = jornadaDiariaNum * 22;
  const dependentesNum = parseInt(dependentes) || 0;

  // Calcular custos CLT
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

  // Calcular salário líquido
  const cltNetSalary = useMemo(() => {
    return calculateNetSalary(salarioBrutoNum, dependentesNum);
  }, [salarioBrutoNum, dependentesNum]);

  const hasValidInput = salarioBrutoNum >= 100;

  return (
    <AppLayout title="Calculadora de Custos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Calculator className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Calculadora de Custos</h1>
            <p className="text-muted-foreground">
              Simule os custos de contratação CLT vs PJ (Simples Nacional)
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Inputs - Linha superior horizontal */}
          <div>
            <CalculatorInputs
              salarioBruto={salarioBruto}
              setSalarioBruto={setSalarioBruto}
              beneficios={beneficios}
              setBeneficios={setBeneficios}
              jornadaDiaria={jornadaDiaria}
              setJornadaDiaria={setJornadaDiaria}
              dependentes={dependentes}
              setDependentes={setDependentes}
            />
          </div>

          {/* Resultados - 3 colunas abaixo */}
          {hasValidInput ? (
            <CalculatorResults
              cltCost={cltCost}
              cltNetSalary={cltNetSalary}
              jornadaMensal={jornadaMensalNum}
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
      </div>
    </AppLayout>
  );
}
