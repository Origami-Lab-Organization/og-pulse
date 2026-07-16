import { useMemo, useRef, useState } from 'react';
import { Copy, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProjectMonth } from '@/lib/projectMonths';
import { BudgetRoleWithMonths } from '@/types/equipe.types';
import { useTenantMonthlyCapacitySummary, getEmployeeMonthLoad } from '@/hooks/useTenantMonthlyCapacitySummary';

export interface ComposerEmployee {
  id: string;
  nome: string;
  cargo: string;
}

export interface RoleSelection {
  useCustom: boolean;
  budgetRoleId: string;
  customRoleName: string;
}

interface AllocationComposerProps {
  tenantId: string;
  projectMonths: ProjectMonth[];
  employees: ComposerEmployee[];
  budgetRoles: BudgetRoleWithMonths[];
  alreadyAllocatedIds: Set<string>;
  allocatedByBudgetRole: Map<string, string[]>;
  /** Vindo de uma vaga: papel travado. */
  lockedRoleLabel?: string | null;
  isEdit: boolean;
  employeeId: string;
  onSelectEmployee: (id: string) => void;
  role: RoleSelection;
  onRoleChange: (role: RoleSelection) => void;
  hours: Record<string, string>;
  onHoursChange: (next: Record<string, string>) => void;
}

const SENIORITY_LABELS: Record<string, string> = { junior: 'Júnior', pleno: 'Pleno', senior: 'Sênior' };
function seniorityLabel(value: string | null | undefined) {
  if (!value) return null;
  return SENIORITY_LABELS[value.toLowerCase()] ?? value;
}
function monthKey(pm: ProjectMonth) {
  return `${pm.year}-${pm.month}`;
}

export function AllocationComposer({
  tenantId,
  projectMonths,
  employees,
  budgetRoles,
  alreadyAllocatedIds,
  allocatedByBudgetRole,
  lockedRoleLabel,
  isEdit,
  employeeId,
  onSelectEmployee,
  role,
  onRoleChange,
  hours,
  onHoursChange,
}: AllocationComposerProps) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const years = useMemo(() => Array.from(new Set(projectMonths.map((pm) => pm.year))), [projectMonths]);
  const { data: capacitySummary } = useTenantMonthlyCapacitySummary({ tenantId, years, enabled: years.length > 0 });

  // Média de horas livres/mês do candidato no período — para fit e mini-indicador.
  const avgFreeByEmployee = useMemo(() => {
    const result = new Map<string, number>();
    if (!capacitySummary) return result;
    employees.forEach((emp) => {
      const free = projectMonths.map((pm) => {
        const load = getEmployeeMonthLoad(capacitySummary, emp.id, pm.year, pm.month);
        return Math.max(0, load.capacityHours - load.plannedHours);
      });
      result.set(emp.id, free.length ? free.reduce((a, b) => a + b, 0) / free.length : 0);
    });
    return result;
  }, [capacitySummary, employees, projectMonths]);

  const selectedEmployee = employees.find((e) => e.id === employeeId) ?? null;

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = employees.filter(
      (e) => !q || e.nome.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q),
    );
    return [...matches].sort((a, b) => {
      const diff = (avgFreeByEmployee.get(b.id) ?? 0) - (avgFreeByEmployee.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.nome.localeCompare(b.nome, 'pt-BR');
    });
  }, [employees, search, avgFreeByEmployee]);

  const setHour = (key: string, val: string) => {
    const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    onHoursChange({ ...hours, [key]: clean });
  };
  const clampHour = (key: string) => {
    const num = parseFloat(hours[key] || '0');
    if (isNaN(num) || num < 0) return onHoursChange({ ...hours, [key]: '0' });
    if (num > 744) return onHoursChange({ ...hours, [key]: '744' });
    onHoursChange({ ...hours, [key]: String(Math.round(num * 10) / 10) });
  };
  const distributeAll = () => {
    const first = projectMonths.find((pm) => parseFloat(hours[monthKey(pm)] || '0') > 0);
    const val = first ? hours[monthKey(first)] : '';
    if (!val) return;
    const next: Record<string, string> = {};
    projectMonths.forEach((pm) => (next[monthKey(pm)] = val));
    onHoursChange(next);
  };
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const target = projectMonths[e.shiftKey ? index - 1 : index + 1];
    if (target) inputRefs.current[monthKey(target)]?.focus();
  };

  return (
    <div className="space-y-5">
      {/* Papel */}
      {lockedRoleLabel ? (
        <div className="space-y-1.5 rounded-md border bg-muted/30 px-3 py-2">
          <Label className="ol-label text-muted-foreground">Papel da vaga</Label>
          <p className="text-sm font-medium text-foreground">{lockedRoleLabel}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Papel *</Label>
          <div className="divide-y rounded-md border">
            <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Papéis orçados
            </div>
            {budgetRoles.length === 0 ? (
              <p className="px-3 py-2 text-sm italic text-muted-foreground">Nenhum papel orçado neste projeto</p>
            ) : (
              budgetRoles.map((r) => {
                const isSelected = !role.useCustom && role.budgetRoleId === r.id;
                const names = allocatedByBudgetRole.get(r.id) ?? [];
                const label =
                  names.length > 0
                    ? `${names[0].split(' ')[0]}${names.length > 1 ? ` +${names.length - 1}` : ''}`
                    : null;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onRoleChange({ useCustom: false, budgetRoleId: r.id, customRoleName: '' })}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                      isSelected ? 'bg-primary-deep/10 text-primary-deep' : 'hover:bg-muted',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {r.role_name}
                      {seniorityLabel(r.seniority) && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · {seniorityLabel(r.seniority)}
                        </span>
                      )}
                    </span>
                    {label ? (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-transparent bg-muted text-xs text-muted-foreground"
                        title={names.join(', ')}
                      >
                        {label}
                      </Badge>
                    ) : (
                      <span className="shrink-0 text-xs text-muted-foreground">vaga aberta</span>
                    )}
                  </button>
                );
              })
            )}
            <button
              type="button"
              onClick={() => onRoleChange({ useCustom: true, budgetRoleId: '', customRoleName: role.customRoleName })}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                role.useCustom ? 'bg-primary-deep/10 text-primary-deep' : 'hover:bg-muted',
              )}
            >
              <span className="font-medium text-primary-deep">+ Criar papel não orçado</span>
            </button>
            {role.useCustom && (
              <div className="px-3 py-2">
                <Input
                  placeholder="Nome do papel (ex: UX Researcher)"
                  value={role.customRoleName}
                  onChange={(e) => onRoleChange({ ...role, useCustom: true, customRoleName: e.target.value })}
                  className="focus-visible:ring-primary-deep"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pessoa */}
      <div className="space-y-2">
        <Label>Funcionário *</Label>
        {selectedEmployee && !isFocused && !isEdit ? (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="min-w-0">
              <span className="text-sm font-medium">{selectedEmployee.nome}</span>
              <span className="ml-2 text-xs text-muted-foreground">{selectedEmployee.cargo}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => {
                setSearch('');
                setIsFocused(true);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : isEdit && selectedEmployee ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">{selectedEmployee.nome}</span>
            <span className="ml-2 text-xs text-muted-foreground">{selectedEmployee.cargo}</span>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
              className="pl-9 focus-visible:ring-primary-deep"
            />
            {isFocused && (
              <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                {filteredEmployees.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum funcionário encontrado</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isAllocated = alreadyAllocatedIds.has(emp.id);
                    const avgFree = capacitySummary ? Math.round(avgFreeByEmployee.get(emp.id) ?? 0) : null;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        disabled={isAllocated}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onSelectEmployee(emp.id);
                          setSearch('');
                          setIsFocused(false);
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                          isAllocated ? 'cursor-not-allowed opacity-50' : 'hover:bg-muted',
                          emp.id === employeeId && 'bg-primary-deep/10 text-primary-deep',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{emp.nome}</span>
                          <span className="ml-2 text-muted-foreground">{emp.cargo}</span>
                        </div>
                        {avgFree !== null && !isAllocated && (
                          <Badge variant="outline" className="shrink-0 border-transparent bg-muted text-xs text-muted-foreground">
                            {avgFree}h livres/mês
                          </Badge>
                        )}
                        {isAllocated && (
                          <Badge variant="outline" className="shrink-0 border-transparent bg-muted text-xs text-muted-foreground">
                            Já alocado
                          </Badge>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Horas por mês */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Horas por mês</Label>
          <Button type="button" variant="outline" size="sm" onClick={distributeAll} className="h-7 gap-1.5 text-xs">
            <Copy className="h-3.5 w-3.5" />
            Distribuir para todos
          </Button>
        </div>
        <div className="overflow-x-auto rounded-md border">
          <div className="flex w-max gap-2 p-3">
            {projectMonths.map((pm, index) => {
              const key = monthKey(pm);
              return (
                <div key={key} className="flex min-w-[64px] flex-col items-center gap-1">
                  <span className="text-xs font-medium capitalize text-muted-foreground">{pm.label}</span>
                  <input
                    ref={(el) => {
                      inputRefs.current[key] = el;
                    }}
                    type="text"
                    inputMode="decimal"
                    value={hours[key] ?? '0'}
                    onChange={(e) => setHour(key, e.target.value)}
                    onBlur={() => clampHour(key)}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={cn(
                      'h-9 w-16 rounded-md border border-input bg-background text-center font-mono text-sm tabular-nums',
                      'focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary-deep',
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
