import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostCenters } from '@/hooks/useCostCenters';
import type { CostCenterSelectProps } from '@/types/costCenter';

/**
 * Seletor de centro de custo para os cadastros de item (serviço e atividade interna).
 * PUL-219: o centro é obrigatório no cadastro, e o item é o que a hora aponta — o centro
 * vem dele (ADR-0031).
 *
 * Oferece só centros ativos, mais o centro atual do item quando ele já foi inativado, para
 * editar o item não apagar em silêncio um vínculo antigo. Sem nenhum centro cadastrado,
 * explica onde cadastrar em vez de mostrar uma lista vazia.
 */
export function CostCenterSelect(props: CostCenterSelectProps) {
  const { value, onChange, disabled, id } = props;
  const { data: costCenters = [], isLoading } = useCostCenters();

  const options = useMemo(
    () => costCenters.filter((c) => c.is_active || c.id === value),
    [costCenters, value],
  );

  if (isLoading) return <Skeleton className="h-10 w-full" />;

  if (options.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
        <Layers className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Nenhum centro de custo cadastrado. Cadastre em{' '}
          <Link to="/admin" className="font-medium text-primary underline-offset-4 hover:underline">
            Portal do Admin, aba Centros de custo
          </Link>
          .
        </span>
      </div>
    );
  }

  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Selecione o centro de custo" />
      </SelectTrigger>
      <SelectContent>
        {options.map((costCenter) => (
          <SelectItem key={costCenter.id} value={costCenter.id}>
            {costCenter.name}
            {!costCenter.is_active && ' (inativo)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
