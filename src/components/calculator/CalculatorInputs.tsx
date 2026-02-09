import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

interface CalculatorInputsProps {
  salarioBruto: string;
  setSalarioBruto: (value: string) => void;
  beneficios: string;
  setBeneficios: (value: string) => void;
  jornadaDiaria: string;
  setJornadaDiaria: (value: string) => void;
  dependentes: string;
  setDependentes: (value: string) => void;
}

// Função para formatar moeda durante digitação
function formatCurrencyInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return '';
  
  // Converte para número e divide por 100 (centavos)
  const amount = parseInt(numbers) / 100;
  
  // Formata para BRL
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Função para extrair valor numérico
export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function CalculatorInputs({
  salarioBruto,
  setSalarioBruto,
  beneficios,
  setBeneficios,
  jornadaDiaria,
  setJornadaDiaria,
  dependentes,
  setDependentes,
}: CalculatorInputsProps) {
  const handleCurrencyChange = (
    value: string,
    setter: (value: string) => void
  ) => {
    setter(formatCurrencyInput(value));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dados do Funcionário</CardTitle>
        <CardDescription>
          Informe os dados para simular os custos de contratação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Salário Bruto CLT */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="salario-bruto">Salário Bruto CLT</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Salário mensal bruto do funcionário CLT, antes dos descontos.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="salario-bruto"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={salarioBruto}
                onChange={(e) => handleCurrencyChange(e.target.value, setSalarioBruto)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Benefícios Mensais */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="beneficios">Benefícios Mensais</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Soma dos benefícios mensais (VR, VT, plano de saúde, etc.)</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                id="beneficios"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={beneficios}
                onChange={(e) => handleCurrencyChange(e.target.value, setBeneficios)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Jornada Diária */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="jornada">Jornada Diária (horas)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Quantidade de horas trabalhadas por dia. Padrão: 8h. A jornada mensal será calculada automaticamente (× 22 dias úteis).</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="jornada"
              type="number"
              min="1"
              max="24"
              placeholder="8"
              value={jornadaDiaria}
              onChange={(e) => setJornadaDiaria(e.target.value)}
            />
          </div>

          {/* Dependentes IRRF */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="dependentes">Dependentes (IRRF)</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Número de dependentes para dedução do IRRF. Cada dependente reduz R$ 189,59 da base de cálculo.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id="dependentes"
              type="number"
              min="0"
              max="10"
              placeholder="0"
              value={dependentes}
              onChange={(e) => setDependentes(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
