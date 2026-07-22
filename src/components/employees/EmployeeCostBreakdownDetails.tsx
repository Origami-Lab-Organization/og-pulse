import { formatCurrency } from "@/lib/formatters";
import {
  CostBreakdown,
  showsChargesSection,
  showsProvisionsSection,
} from "@/lib/employeeCostCalculator";
import { ContractType } from "@/types/employee";

interface EmployeeCostBreakdownDetailsProps {
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

export function EmployeeCostBreakdownDetails({
  costBreakdown,
  tipoContratacao,
}: EmployeeCostBreakdownDetailsProps) {
  const details = costBreakdown?.details;

  if (tipoContratacao === "PJ") {
    return (
      <p className="text-xs text-muted-foreground">
        Para contratos PJ, não há encargos trabalhistas ou provisões a calcular.
      </p>
    );
  }

  const showCharges = showsChargesSection(tipoContratacao);
  const showProvisions = showsProvisionsSection(tipoContratacao);

  return (
    <div className="space-y-3">
      {showCharges && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Encargos sobre Salário
          </p>
          <CostRow
            label={`FGTS (${tipoContratacao === "MENOR_APRENDIZ" ? "2%" : "8%"})`}
            value={formatCurrency(details?.fgts || 0)}
          />
          {(details?.inss || 0) > 0 && (
            <CostRow label="INSS Patronal" value={formatCurrency(details?.inss || 0)} />
          )}
          {(details?.inssFuncionario || 0) > 0 && (
            <CostRow
              label="INSS do Funcionário (retido)"
              value={formatCurrency(details?.inssFuncionario || 0)}
            />
          )}
        </div>
      )}

      {showProvisions && tipoContratacao !== "SOCIO" && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Provisões Mensais
          </p>
          {tipoContratacao === "ESTAGIO" ? (
            <CostRow
              label="Provisão Recesso 1/12"
              value={formatCurrency(details?.provisaoRecesso || 0)}
            />
          ) : (
            <>
              <CostRow label="13º prop. 1/12" value={formatCurrency(details?.provisao13 || 0)} />
              <CostRow
                label="Férias prop. 1/12"
                value={formatCurrency(details?.provisaoFeriasBase || 0)}
              />
              <CostRow
                label="1/3 de Férias"
                value={formatCurrency(details?.provisaoFeriasTerco || 0)}
              />
            </>
          )}
        </div>
      )}

      {showCharges &&
        showProvisions &&
        tipoContratacao !== "ESTAGIO" &&
        tipoContratacao !== "SOCIO" && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Encargos sobre Provisões
            </p>
            <CostRow label="FGTS 13º (prov)" value={formatCurrency(details?.fgts13 || 0)} />
            <CostRow label="FGTS Férias (prov)" value={formatCurrency(details?.fgtsFerias || 0)} />
          </div>
        )}
    </div>
  );
}
