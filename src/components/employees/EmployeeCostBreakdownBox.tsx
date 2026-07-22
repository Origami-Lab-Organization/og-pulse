import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { CostBreakdown } from "@/lib/employeeCostCalculator";
import { ContractType } from "@/types/employee";
import { EmployeeCostBreakdownDetails } from "@/components/employees/EmployeeCostBreakdownDetails";

interface EmployeeCostBreakdownBoxProps {
  costBreakdown: CostBreakdown | null;
  tipoContratacao: ContractType;
}

export function EmployeeCostBreakdownBox({
  costBreakdown,
  tipoContratacao,
}: EmployeeCostBreakdownBoxProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-3 rounded-lg bg-accent-subtle p-4">
      <div className="text-sm font-semibold">Resumo de Custos</div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <div className="text-xs text-muted-foreground">Base</div>
          <div className="text-sm font-semibold">
            {formatCurrency(costBreakdown?.baseAmount || 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Encargos</div>
          <div className="text-sm font-semibold">
            {formatCurrency(costBreakdown?.chargesAmount || 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Provisões</div>
          <div className="text-sm font-semibold">
            {formatCurrency(costBreakdown?.provisionsAmount || 0)}
          </div>
        </div>
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver detalhamento
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <EmployeeCostBreakdownDetails
            costBreakdown={costBreakdown}
            tipoContratacao={tipoContratacao}
          />
        </CollapsibleContent>
      </Collapsible>

      <div className="flex items-center justify-between border-t border-primary/15 pt-3 text-sm font-bold text-primary">
        <span>Total Mensal</span>
        <span>{formatCurrency(costBreakdown?.totalMonthlyCost || 0)}</span>
      </div>
    </div>
  );
}
