import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { CalculatorInputs, parseCurrencyInput } from '@/components/calculator/CalculatorInputs';
import { CalculatorResults } from '@/components/calculator/CalculatorResults';
import { CalculatorBreakdown } from '@/components/calculator/CalculatorBreakdown';
import { calculateEmployeeCost } from '@/lib/employeeCostCalculator';
import { calculateNetSalary } from '@/lib/netSalaryCalculator';
import { Calculator } from 'lucide-react';

const DEFAULT_JORNADA = 168;

export default function EmployeeCalculator() {
  const [salarioBruto, setSalarioBruto] = useState('');
  const [beneficios, setBeneficios] = useState('');
  const [jornadaMensal, setJornadaMensal] = useState(DEFAULT_JORNADA.toString());
  const [dependentes, setDependentes] = useState('0');

  // Parse valores
  const salarioBrutoNum = parseCurrencyInput(salarioBruto);
  const beneficiosNum = parseCurrencyInput(beneficios);
  const jornadaNum = parseInt(jornadaMensal) || DEFAULT_JORNADA;
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

  const hasValidInput = salarioBrutoNum >= 1412;

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
              Simule os custos de contratação CLT vs PJ
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Inputs - Coluna esquerda */}
          <div className="space-y-4">
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

            {!hasValidInput && salarioBruto && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ O salário mínimo em 2024 é R$ 1.412,00
              </p>
            )}
          </div>

          {/* Resultados - Coluna direita */}
          <div className="space-y-6">
            {hasValidInput ? (
              <>
                <CalculatorResults
                  cltCost={cltCost}
                  cltNetSalary={cltNetSalary}
                  jornadaMensal={jornadaNum}
                />
                <CalculatorBreakdown
                  cltCost={cltCost}
                  cltNetSalary={cltNetSalary}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Informe o salário bruto CLT para ver os resultados</p>
                  <p className="text-sm">(mínimo R$ 1.412,00)</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
