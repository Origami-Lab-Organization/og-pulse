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
import { BudgetRoleWithMonths, AddAllocationPayload, ProjectAllocation } from '@/types/equipe.types';
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
      {/* Employee selector */}
      <div className="space-y-2">
        <Label>Funcionário *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
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
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{emp.nome}</span>
                    <span className="ml-2 text-muted-foreground">{emp.cargo}</span>
                  </div>
                  {isAllocated && (
                    <Badge variant="secondary" className="text-xs shrink-0">Já alocado</Badge>
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
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <span className="flex-1 font-medium">{role.role_name}</span>
                  {avgHours && (
                    <span className="text-xs text-muted-foreground">{avgHours}h/mês orçadas</span>
                  )}
                  {role.filled && (
                    <Badge variant="secondary" className="text-xs">Já preenchido</Badge>
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
              useCustomRole ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
            )}
          >
            <span className="text-primary font-medium">+ Definir papel fora do orçamento</span>
          </button>

          {useCustomRole && (
            <div className="px-3 py-2">
              <Input
                placeholder="Nome do papel (ex: UX Researcher)"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
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

      <DialogFooter>
        <Button onClick={handleNext} disabled={!selectedEmployeeId}>
          Próximo
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────

interface Step2Props {
  projectMonths: ProjectMonth[];
  selectedBudgetRole: BudgetRoleWithMonths | null;
  initialHours?: Record<string, number>; // "year-month" → hours (for edit mode)
  isPending: boolean;
  onBack: () => void;
  onSubmit: (hours: { year: number; month: number; plannedHours: number }[]) => void;
}

function Step2({ projectMonths, selectedBudgetRole, initialHours, isPending, onBack, onSubmit }: Step2Props) {
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
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
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

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
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
  project: {
    id: string;
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
              1. Funcionário e papel
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
            onBack={() => setStep(1)}
            onSubmit={handleStep2Submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
