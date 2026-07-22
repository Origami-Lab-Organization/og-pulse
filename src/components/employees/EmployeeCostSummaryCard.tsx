import { useState } from "react";
import { Calculator, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { CostBreakdown } from "@/lib/employeeCostCalculator";
import { ContractType } from "@/types/employee";
import { EmployeeCostBreakdownDetails } from "@/components/employees/EmployeeCostBreakdownDetails";

interface EmployeeCostSummaryCardProps {
  costBreakdown: CostBreakdown | null;
  tipoContratacao: ContractType;
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function EmployeeCostSummaryCard({
  costBreakdown,
  tipoContratacao,
}: EmployeeCostSummaryCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const subtotalSalarial =
    (costBreakdown?.baseAmount || 0) +
    (costBreakdown?.chargesAmount || 0) +
    (costBreakdown?.provisionsAmount || 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calculator className="h-4 w-4" />
          Custo Mensal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(costBreakdown?.totalMonthlyCost || 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(costBreakdown?.totalAnnualCost || 0)}/ano
          </div>
        </div>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Ver detalhamento
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <EmployeeCostBreakdownDetails
              costBreakdown={costBreakdown}
              tipoContratacao={tipoContratacao}
            />

            <Separator />

            <div className="space-y-1.5">
              <CostRow label="Base" value={formatCurrency(costBreakdown?.baseAmount || 0)} />
              <CostRow
                label="Encargos"
                value={formatCurrency(costBreakdown?.chargesAmount || 0)}
              />
              <CostRow
                label="Provisões"
                value={formatCurrency(costBreakdown?.provisionsAmount || 0)}
              />
              <div className="flex justify-between border-t pt-1.5 text-xs font-semibold">
                <span>Subtotal Salarial</span>
                <span>{formatCurrency(subtotalSalarial)}</span>
              </div>
              <CostRow
                label="Benefícios"
                value={formatCurrency(costBreakdown?.benefitsAmount || 0)}
              />
              <CostRow
                label="Ferramentas"
                value={formatCurrency(costBreakdown?.toolsAmount || 0)}
              />
              <div className="flex justify-between border-t pt-1.5 text-sm font-bold text-primary">
                <span>Custo Total Mensal</span>
                <span>{formatCurrency(costBreakdown?.totalMonthlyCost || 0)}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
