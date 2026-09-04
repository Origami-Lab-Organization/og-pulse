import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useServices } from '@/hooks/useServices';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PortfolioFiltersProps {
  canFilterManagers: boolean;
  clientId: string;
  serviceLine: string;
  managerId: string;
  year: string;
  onClientChange: (value: string) => void;
  onServiceLineChange: (value: string) => void;
  onManagerChange: (value: string) => void;
  onYearChange: (value: string) => void;
}

interface ClientOption {
  id: string;
  company_name: string;
  trading_name: string | null;
}

interface ManagerOption {
  id: string;
  nome: string;
}

export function PortfolioFilters({
  canFilterManagers,
  clientId,
  serviceLine,
  managerId,
  year,
  onClientChange,
  onServiceLineChange,
  onManagerChange,
  onYearChange,
}: PortfolioFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
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

  useEffect(() => {
    if (!tenantId || !canFilterManagers) return;
    // A lista é de quem GERENCIA projeto, e por isso sai dos próprios projetos em vez da
    // coluna legada `is_gerente` (aposentada em PUL-206). Também fica mais correta: filtrar
    // o portfólio por alguém que tem a flag mas não gerencia nada nunca devolvia nada.
    supabase
      .from('projects')
      .select('manager:employees!projects_manager_id_fkey(id, nome)')
      .eq('tenant_id', tenantId)
      .not('manager_id', 'is', null)
      .then(({ data }) => {
        const porId = new Map<string, ManagerOption>();
        for (const row of (data || []) as { manager?: ManagerOption | null }[]) {
          if (row.manager?.id) porId.set(row.manager.id, row.manager);
        }
        setManagers([...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      });
  }, [tenantId, canFilterManagers]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Filtro de Ano */}
      <Select value={year || '__all__'} onValueChange={v => onYearChange(v === '__all__' ? '' : v)}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Todos os anos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os anos</SelectItem>
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

      {/* Seguindo .harness/patterns/security.md: filtro visível para quem pode ver o portfólio,
          mas autorização de escrita continua por recurso/RLS. */}
      {canFilterManagers && (
        <Select value={managerId || '__all__'} onValueChange={v => onManagerChange(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Todos os gerentes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos os gerentes</SelectItem>
            {managers.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
