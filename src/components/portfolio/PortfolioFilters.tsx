import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServices } from '@/hooks/useServices';
import type { PortfolioScope } from '@/types/portfolio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PortfolioFiltersProps {
  clientId: string;
  serviceLine: string;
  year: string;
  /** Alcance: só os projetos de quem está logado, ou todos (US-0035). */
  scope: PortfolioScope;
  onClientChange: (value: string) => void;
  onServiceLineChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onScopeChange: (value: PortfolioScope) => void;
}

interface ClientOption {
  id: string;
  company_name: string;
  trading_name: string | null;
}

const SCOPES: { value: PortfolioScope; label: string }[] = [
  { value: 'mine', label: 'Meus projetos' },
  { value: 'all', label: 'Todos' },
];

export function PortfolioFilters(props: PortfolioFiltersProps) {
  const { clientId, serviceLine, year, scope, onClientChange, onServiceLineChange, onYearChange, onScopeChange } = props;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const [clients, setClients] = useState<ClientOption[]>([]);
  const { data: services = [] } = useServices();

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from('clients')
      .select('id, company_name, trading_name')
      .eq('tenant_id', tenantId)
      .order('company_name')
      .then(({ data }) => setClients((data || []) as ClientOption[]));
  }, [tenantId]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Ano */}
      {/* O ano é sempre um ano: os indicadores falam de receita "em 2026" (US-0034). */}
      <Select value={year} onValueChange={onYearChange}>
        <SelectTrigger className="w-[120px]" aria-label="Ano">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map(y => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Cliente */}
      <Select value={clientId || '__all__'} onValueChange={v => onClientChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os clientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os clientes</SelectItem>
          {clients.map(c => (
            <SelectItem key={c.id} value={c.id}>
              {c.trading_name || c.company_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtro de Linha de Serviço */}
      <Select value={serviceLine || '__all__'} onValueChange={v => onServiceLineChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todas as linhas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as linhas</SelectItem>
          {services.filter(s => s.isActive).map(s => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* O alcance é escolha da tela; quem pode ler o quê continua no RLS. */}
      <div role="group" aria-label="Alcance" className="flex h-10 overflow-hidden rounded-md border border-border">
        {SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={scope === option.value}
            onClick={() => onScopeChange(option.value)}
            className={
              scope === option.value
                ? 'bg-primary px-3 text-sm font-medium text-primary-foreground'
                : 'px-3 text-sm text-muted-foreground hover:bg-muted/60'
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
