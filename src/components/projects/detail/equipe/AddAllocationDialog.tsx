import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, Search, Copy } from 'lucide-react';
import { addMonths, parseISO, format, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/useEmployees';
import { useProjectBudgetRoles } from '@/hooks/useProjectBudgetRoles';
import { useAddAllocation } from '@/hooks/useProjectRoles';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget } from '@/hooks/useBudgets';
import { useMaskedCurrency, useMaskedPercent } from '@/contexts/HideValuesContext';
import { BudgetRoleWithMonths, AddAllocationPayload, ProjectAllocation } from '@/types/equipe.types';
import { ProjectWithRelations } from '@/types/project';
import { useAuth } from '@/contexts/AuthContext';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  employeeId: z.string().min(1, 'Selecione um funcionário'),
  budgetRoleId: z.string().optional(),
  customRoleName: z.string().optional(),
}).refine(
  (d) => d.budgetRoleId || (d.customRoleName && d.customRoleName.trim().length >= 2),
  { message: 'Selecione um papel orçado ou defina um papel personalizado (mín. 2 caracteres)' }
);

type Step1Values = z.infer<typeof step1Schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProjectMonth {
  year: number;
  month: number;
  label: string;
  monthNumber: number;
}

function buildProjectMonths(startDate: string, endDate: string | null): ProjectMonth[] {
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addMonths(start, 12);
  const months: ProjectMonth[] = [];
  let current = start;
  let i = 1;
  while (current <= end) {
    months.push({
      year: getYear(current),
      month: getMonth(current) + 1,
      label: format(current, 'MMM/yy', { locale: ptBR }),
      monthNumber: i,
    });
    current = addMonths(current, 1);
    i++;
  }
  return months;
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────

interface Step1Props {
  projectId: string;
  budgetId: string | null;
  alreadyAllocatedIds: Set<string>;
  onNext: (values: Step1Values) => void;
}

function Step1({ projectId, budgetId, alreadyAllocatedIds, onNext }: Step1Props) {
  const { data: employees = [] } = useEmployees();
  const { budgetRoles } = useProjectBudgetRoles(budgetId, projectId);

  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedBudgetRoleId, setSelectedBudgetRoleId] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [error, setError] = useState('');

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) => e.nome.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q)
    );
  }, [employees, search]);

  const handleNext = () => {
    const result = step1Schema.safeParse({
      employeeId: selectedEmployeeId,
      budgetRoleId: useCustomRole ? undefined : selectedBudgetRoleId || undefined,
      customRoleName: useCustomRole ? customRoleName : undefined,
    });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError('');
    onNext(result.data);
  };

  return (
    <div className="space-y-5">
      {/* Role selector */}
      <div className="space-y-2">
        <Label>Papel *</Label>
        <div className="rounded-md border divide-y">
          {/* Budget roles section */}
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wide">
            Papéis orçados
          </div>
          {budgetRoles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground italic">
              Nenhum papel orçado neste projeto
            </p>
          ) : (
            budgetRoles.map((role) => {
              const isSelected = !useCustomRole && selectedBudgetRoleId === role.id;
              const avgHours = role.months.length
                ? Math.round(role.months.reduce((s, m) => s + m.hours, 0) / role.months.length)
                : null;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setUseCustomRole(false);
                    setSelectedBudgetRoleId(role.id);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                    isSelected ? 'bg-primary-deep/10 text-primary-deep' : 'hover:bg-muted'
                  )}
                >
                  <span className="flex-1 font-medium">{role.role_name}</span>
                  {avgHours && (
                    <span className="text-xs text-muted-foreground">{avgHours}h/mês orçadas</span>
                  )}
                  {role.filled && (
                    <Badge variant="outline" className="text-xs border-transparent bg-muted text-muted-foreground">Já preenchido</Badge>
                  )}
                </button>
              );
            })
          )}

          {/* Custom role section */}
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wide">
            Criar papel não orçado
          </div>
          <button
            type="button"
            onClick={() => {
              setUseCustomRole(true);
              setSelectedBudgetRoleId('');
            }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
              useCustomRole ? 'bg-primary-deep/10 text-primary-deep' : 'hover:bg-muted'
            )}
          >
            <span className="text-primary-deep font-medium">+ Definir papel fora do orçamento</span>
          </button>

          {useCustomRole && (
            <div className="px-3 py-2">
              <Input
                placeholder="Nome do papel (ex: UX Researcher)"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                className="focus-visible:ring-primary-deep"
                autoFocus
              />
              {customRoleName.trim().length > 0 && customRoleName.trim().length < 2 && (
                <p className="text-xs text-destructive mt-1">Mínimo 2 caracteres</p>
              )}
            </div>
          )}
        </div>

        {selectedEmployeeId && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      {/* Employee selector */}
      <div className="space-y-2">
        <Label>Funcionário *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 focus-visible:ring-primary-deep"
          />
        </div>
        <div className="max-h-40 overflow-y-auto rounded-md border divide-y">
          {filteredEmployees.length === 0 ? (
            <p className="px-3 py-4 text-sm text-center text-muted-foreground">
              Nenhum funcionário cadastrado
            </p>
          ) : (
            filteredEmployees.map((emp) => {
              const isAllocated = alreadyAllocatedIds.has(emp.id);
              const isSelected = selectedEmployeeId === emp.id;
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => setSelectedEmployeeId(emp.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
                    isSelected
                      ? 'bg-primary-deep/10 text-primary-deep'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{emp.nome}</span>
                    <span className="ml-2 text-muted-foreground">{emp.cargo}</span>
                  </div>
                  {isAllocated && (
                    <Badge variant="outline" className="text-xs shrink-0 border-transparent bg-muted text-muted-foreground">Já alocado</Badge>
                  )}
                </button>
              );
            })
          )}
        </div>
        {!selectedEmployeeId && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleNext} disabled={!selectedEmployeeId} className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90">
          Próximo
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface MarginSimulationInput {
  roleName: string;
  hourlyCost: number;
  revenue: number;
  existingCosts: number;
  commissionPlanned: number;
  marginTarget: number;
}

function marginToneClasses(margin: number, marginTarget: number) {
  if (margin <= 0) return 'text-destructive';
  if (marginTarget > 0 && margin < marginTarget) return 'text-warning';
  return 'text-primary-deep';
}

function MarginSimulationCard({ simulation, totalNewHours }: { simulation: MarginSimulationInput; totalNewHours: number }) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();

  const newRoleCost = totalNewHours * simulation.hourlyCost;
  const currentMargin = simulation.revenue > 0
    ? ((simulation.revenue - simulation.existingCosts - simulation.commissionPlanned) / simulation.revenue) * 100
    : 0;
  const projectedMargin = simulation.revenue > 0
    ? ((simulation.revenue - simulation.existingCosts - newRoleCost - simulation.commissionPlanned) / simulation.revenue) * 100
    : 0;
  const deltaPoints = projectedMargin - currentMargin;

  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b bg-muted/50 px-4 py-2">
        <p className="ol-label text-muted-foreground">Simulação de margem com {simulation.roleName}</p>
      </div>
      <div className="grid grid-cols-3 divide-x">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Custo desta alocação</p>
          <p className="font-mono text-base font-semibold tabular-nums text-foreground">
            {formatCurrency(newRoleCost)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Margem atual</p>
          <p className="font-mono text-base font-semibold tabular-nums text-foreground">
            {formatPercent(currentMargin, 1)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">Margem projetada</p>
          <p className={cn('font-mono text-base font-semibold tabular-nums', marginToneClasses(projectedMargin, simulation.marginTarget))}>
            {formatPercent(projectedMargin, 1)}
          </p>
        </div>
      </div>
      {simulation.revenue > 0 && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">
          {deltaPoints < 0 ? `${formatPercent(Math.abs(deltaPoints), 1)} a menos` : 'Sem impacto'} em relação à margem atual
          {simulation.marginTarget > 0 && ` · meta ${simulation.marginTarget}%`}
        </div>
      )}
    </section>
  );
}

interface Step2Props {
  projectMonths: ProjectMonth[];
  selectedBudgetRole: BudgetRoleWithMonths | null;
  initialHours?: Record<string, number>; // "year-month" → hours (for edit mode)
  isPending: boolean;
  simulation: MarginSimulationInput | null;
  onBack: () => void;
  onSubmit: (hours: { year: number; month: number; plannedHours: number }[]) => void;
}

function Step2({ projectMonths, selectedBudgetRole, initialHours, isPending, simulation, onBack, onSubmit }: Step2Props) {
  // Build initial values: pre-fill from budget role months or existing allocation
  const defaultHours: Record<string, string> = {};
  projectMonths.forEach((pm) => {
    const key = `${pm.year}-${pm.month}`;
    if (initialHours && initialHours[key] !== undefined) {
      defaultHours[key] = String(initialHours[key]);
    } else if (selectedBudgetRole) {
      const bm = selectedBudgetRole.months.find((m) => m.month_number === pm.monthNumber);
      defaultHours[key] = bm ? String(bm.hours) : '0';
    } else {
      defaultHours[key] = '0';
    }
  });

  const [hours, setHours] = useState<Record<string, string>>(defaultHours);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setHour = (key: string, val: string) => {
    // Allow only numbers and one decimal point
    const clean = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setHours((prev) => ({ ...prev, [key]: clean }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateAndClamp = (key: string) => {
    const num = parseFloat(hours[key] || '0');
    if (isNaN(num) || num < 0) {
      setHours((prev) => ({ ...prev, [key]: '0' }));
      return;
    }
    if (num > 744) {
      setErrors((prev) => ({ ...prev, [key]: 'Máx 744h' }));
      setHours((prev) => ({ ...prev, [key]: '744' }));
      return;
    }
    // Round to 1 decimal
    setHours((prev) => ({ ...prev, [key]: String(Math.round(num * 10) / 10) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const next = projectMonths[index + 1];
      if (next) {
        inputRefs.current[`${next.year}-${next.month}`]?.focus();
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const prev = projectMonths[index - 1];
      if (prev) {
        inputRefs.current[`${prev.year}-${prev.month}`]?.focus();
      }
    }
  };

  const replicateAll = () => {
    const first = projectMonths.find((pm) => {
      const v = parseFloat(hours[`${pm.year}-${pm.month}`] || '0');
      return v > 0;
    });
    if (!first) return;
    const val = hours[`${first.year}-${first.month}`];
    const next: Record<string, string> = {};
    projectMonths.forEach((pm) => { next[`${pm.year}-${pm.month}`] = val; });
    setHours(next);
  };

  const handleSubmit = () => {
    const result = projectMonths.map((pm) => ({
      year: pm.year,
      month: pm.month,
      plannedHours: Math.max(0, parseFloat(hours[`${pm.year}-${pm.month}`] || '0') || 0),
    }));
    onSubmit(result);
  };

  const avgBudgeted = selectedBudgetRole && selectedBudgetRole.months.length
    ? Math.round(selectedBudgetRole.months.reduce((s, m) => s + m.hours, 0) / selectedBudgetRole.months.length)
    : null;

  const totalNewHours = projectMonths.reduce(
    (sum, pm) => sum + (parseFloat(hours[`${pm.year}-${pm.month}`] || '0') || 0),
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Defina as horas planejadas para cada mês do projeto.
        </p>
        <Button variant="outline" size="sm" onClick={replicateAll} className="gap-1.5 text-xs">
          <Copy className="w-3.5 h-3.5" />
          Replicar para todos os meses
        </Button>
      </div>

      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex p-3 gap-2">
          {projectMonths.map((pm, index) => {
            const key = `${pm.year}-${pm.month}`;
            const budgetMonth = selectedBudgetRole?.months.find((m) => m.month_number === pm.monthNumber);
            return (
              <div key={key} className="flex flex-col items-center gap-1 min-w-[64px]">
                <span className="text-xs font-medium text-muted-foreground capitalize">{pm.label}</span>
                <input
                  ref={(el) => { inputRefs.current[key] = el; }}
                  type="text"
                  inputMode="decimal"
                  value={hours[key] ?? '0'}
                  onChange={(e) => setHour(key, e.target.value)}
                  onBlur={() => validateAndClamp(key)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={cn(
                    'w-14 h-9 text-center text-sm rounded-md border bg-background transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary-deep focus:border-primary-deep',
                    errors[key] ? 'border-destructive' : 'border-input'
                  )}
                />
                {errors[key] ? (
                  <span className="text-[10px] text-destructive leading-tight">{errors[key]}</span>
                ) : budgetMonth ? (
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Orçado: {budgetMonth.hours}h
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {simulation && <MarginSimulationCard simulation={simulation} totalNewHours={totalNewHours} />}

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} className="bg-primary-deep text-primary-deep-foreground hover:bg-primary-deep/90">
          {isPending ? 'Alocando...' : 'Alocar'}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

interface AddAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectWithRelations & {
    budget_id: string | null;
    start_date: string;
    end_date: string | null;
    tenant_id: string;
  };
  alreadyAllocatedIds: Set<string>;
  /** When provided, opens directly on Step 2 in edit mode */
  editAllocation?: ProjectAllocation;
}

export function AddAllocationDialog({
  open,
  onOpenChange,
  project,
  alreadyAllocatedIds,
  editAllocation,
}: AddAllocationDialogProps) {
  const { employee } = useAuth();
  const { budgetRoles } = useProjectBudgetRoles(project.budget_id, project.id);
  const { data: employees = [] } = useEmployees();
  const { data: financialSettings } = useFinancialSettings();
  const { data: budget } = useBudget(project.budget_id);
  const projectMonths = useMemo(
    () => buildProjectMonths(project.start_date, project.end_date),
    [project.start_date, project.end_date]
  );

  const [step, setStep] = useState<1 | 2>(editAllocation ? 2 : 1);
  const [step1Values, setStep1Values] = useState<Step1Values | null>(
    editAllocation
      ? {
          employeeId: editAllocation.employeeId,
          budgetRoleId: editAllocation.budgetRoleId ?? undefined,
          customRoleName: editAllocation.customRoleName ?? undefined,
        }
      : null
  );

  // Reset when dialog closes
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      if (!editAllocation) {
        setStep(1);
        setStep1Values(null);
      }
    }, 200);
  };

  const addAllocation = useAddAllocation(project.id, handleClose);

  const handleStep1Next = (values: Step1Values) => {
    setStep1Values(values);
    setStep(2);
  };

  const handleStep2Submit = (monthlyHours: { year: number; month: number; plannedHours: number }[]) => {
    if (!step1Values) return;
    const payload: AddAllocationPayload = {
      projectId: project.id,
      tenantId: project.tenant_id,
      employeeId: step1Values.employeeId,
      budgetRoleId: step1Values.budgetRoleId,
      customRoleName: step1Values.customRoleName,
      monthlyHours,
    };
    addAllocation.mutate(payload);
  };

  const selectedBudgetRole = step1Values?.budgetRoleId
    ? budgetRoles.find((r) => r.id === step1Values.budgetRoleId) ?? null
    : null;

  // Build initialHours map for edit mode
  const initialHours = editAllocation
    ? Object.fromEntries(
        editAllocation.monthlyHours.map((mh) => [`${mh.year}-${mh.month}`, mh.plannedHours])
      )
    : undefined;

  // ── Margin simulation: cost of every OTHER allocated member (this role is excluded
  // so it isn't double-counted, both when adding a new member and when editing one
  // who's already in project.members) + suppliers + materials, vs. revenue/commission.
  const existingPlannedCosts = useMemo(() => {
    const months = projectMonths.length || 1;
    const excludeEmployeeId = step1Values?.employeeId;

    const laborPlanned = (project.members || [])
      .filter((member) => member.employee_id !== excludeEmployeeId)
      .reduce((sum, member) => {
        const hourlyCost = member.employee && member.employee.jornada_mensal > 0
          ? member.employee.total_monthly_cost_estimated / member.employee.jornada_mensal
          : 0;
        return sum + hourlyCost * Number(member.hours_per_month || 0) * months;
      }, 0);

    const supplierPlanned = (project.suppliers || []).reduce((sum, supplier) => {
      const supplierMonths = supplier.end_month ? supplier.end_month - supplier.start_month + 1 : months;
      return sum + Number(supplier.monthly_value || 0) * supplierMonths;
    }, 0);

    const materialPlanned = (project.materials || []).reduce((sum, material) => sum + Number(material.value || 0), 0);

    return laborPlanned + supplierPlanned + materialPlanned;
  }, [project.members, project.suppliers, project.materials, projectMonths.length, step1Values?.employeeId]);

  const selectedEmployee = step1Values ? employees.find((emp) => emp.id === step1Values.employeeId) : undefined;
  const selectedEmployeeHourlyCost = selectedEmployee && selectedEmployee.jornadaMensal > 0
    ? selectedEmployee.totalMonthlyCostEstimated / selectedEmployee.jornadaMensal
    : 0;

  const simulation: MarginSimulationInput | null = step1Values
    ? {
        roleName: step1Values.customRoleName?.trim() || selectedBudgetRole?.role_name || 'este papel',
        hourlyCost: selectedEmployeeHourlyCost,
        revenue: Number(project.total_value || 0),
        existingCosts: existingPlannedCosts,
        commissionPlanned: budget ? (budget.commission_percent / 100) * budget.total_with_fees : 0,
        marginTarget: financialSettings?.gross_margin_target_percent ?? 0,
      }
    : null;

  const isEdit = !!editAllocation;
  const titleMap = {
    1: 'Alocar Funcionário — Passo 1 de 2',
    2: isEdit ? 'Editar Jornada' : 'Alocar Funcionário — Passo 2 de 2',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{titleMap[step]}</DialogTitle>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn('font-medium', step === 1 && 'text-foreground')}>
              1. Papel e funcionário
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className={cn('font-medium', step === 2 && 'text-foreground')}>
              2. Jornada de horas
            </span>
          </div>
        )}

        {step === 1 && (
          <Step1
            projectId={project.id}
            budgetId={project.budget_id}
            alreadyAllocatedIds={alreadyAllocatedIds}
            onNext={handleStep1Next}
          />
        )}

        {step === 2 && (
          <Step2
            projectMonths={projectMonths}
            selectedBudgetRole={selectedBudgetRole}
            initialHours={initialHours}
            isPending={addAllocation.isPending}
            simulation={simulation}
            onBack={() => setStep(1)}
            onSubmit={handleStep2Submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
