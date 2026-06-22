import { useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import { addMonths, parseISO, format, getYear, getMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useProjectBudgetRoles } from "@/hooks/useProjectBudgetRoles";
import {
  useAddAllocation,
  useProjectAllocations,
} from "@/hooks/useProjectRoles";
import {
  useEmployeeMonthlyLoad,
  monthLoadKey,
} from "@/hooks/useEmployeeMonthlyLoad";
import {
  BudgetRoleWithMonths,
  AddAllocationPayload,
  ProjectAllocation,
} from "@/types/equipe.types";
import { useAuth } from "@/contexts/AuthContext";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z
  .object({
    employeeId: z.string().min(1, "Selecione um funcionário"),
    budgetRoleId: z.string().optional(),
    customRoleName: z.string().optional(),
  })
  .refine(
    (d) =>
      d.budgetRoleId ||
      (d.customRoleName && d.customRoleName.trim().length >= 2),
    {
      message:
        "Selecione um papel orçado ou defina um papel personalizado (mín. 2 caracteres)",
    },
  );

type Step1Values = z.infer<typeof step1Schema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ProjectMonth {
  year: number;
  month: number;
  label: string;
  monthNumber: number;
}

const SENIORITY_LABELS: Record<string, string> = {
  junior: "Júnior",
  pleno: "Pleno",
  senior: "Sênior",
};

function seniorityLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return SENIORITY_LABELS[value.toLowerCase()] ?? value;
}

function buildProjectMonths(
  startDate: string,
  endDate: string | null,
): ProjectMonth[] {
  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : addMonths(start, 12);
  const months: ProjectMonth[] = [];
  let current = start;
  let i = 1;
  while (current <= end) {
    months.push({
      year: getYear(current),
      month: getMonth(current) + 1,
      label: format(current, "MMM/yy", { locale: ptBR }),
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

function Step1({
  projectId,
  budgetId,
  alreadyAllocatedIds,
  onNext,
}: Step1Props) {
  const { data: employees = [] } = useEmployees();
  const { budgetRoles } = useProjectBudgetRoles(budgetId, projectId);
  const { data: projectAllocations = [] } = useProjectAllocations(projectId);

  // Quem já está alocado em cada papel orçado (reflete a equipe atual do projeto).
  const allocatedByBudgetRole = useMemo(() => {
    const map = new Map<string, string[]>();
    projectAllocations.forEach((alloc) => {
      if (!alloc.budgetRoleId) return;
      const names = map.get(alloc.budgetRoleId) ?? [];
      names.push(alloc.employee.nome);
      map.set(alloc.budgetRoleId, names);
    });
    return map;
  }, [projectAllocations]);

  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedBudgetRoleId, setSelectedBudgetRoleId] = useState("");
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [customRoleName, setCustomRoleName] = useState("");
  const [error, setError] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.nome.toLowerCase().includes(q) || e.cargo.toLowerCase().includes(q),
    );
  }, [employees, search]);

  const selectedEmployee =
    employees.find((e) => e.id === selectedEmployeeId) ?? null;
  // Lista só aparece quando o usuário começa a digitar (combobox), não ao abrir/focar.
  const showEmployeeList = isInputFocused && search.trim().length > 0;

  const handleNext = () => {
    const result = step1Schema.safeParse({
      employeeId: selectedEmployeeId,
      budgetRoleId: useCustomRole
        ? undefined
        : selectedBudgetRoleId || undefined,
      customRoleName: useCustomRole ? customRoleName : undefined,
    });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError("");
    onNext(result.data);
  };

  return (
    <div className="space-y-5">
      {/* Employee selector */}
      <div className="space-y-2">
        <Label>Funcionário *</Label>

        {selectedEmployee && !isSearchOpen ? (
          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <div className="min-w-0">
              <span className="text-sm font-medium">
                {selectedEmployee.nome}
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                {selectedEmployee.cargo}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs"
              onClick={() => {
                setSearch("");
                setIsSearchOpen(true);
              }}
            >
              Trocar
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() =>
                window.setTimeout(() => setIsInputFocused(false), 120)
              }
              autoFocus={isSearchOpen}
              className="pl-9"
            />

            {showEmployeeList && (
              <div className="absolute z-50 bottom-full mb-1 max-h-48 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                {filteredEmployees.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                    Nenhum funcionário encontrado
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isAllocated = alreadyAllocatedIds.has(emp.id);
                    const isSelected = selectedEmployeeId === emp.id;
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        // mousedown.preventDefault mantém o foco para o onClick disparar antes do blur fechar a lista
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setSearch("");
                          setIsSearchOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium">{emp.nome}</span>
                          <span className="ml-2 text-muted-foreground">
                            {emp.cargo}
                          </span>
                        </div>
                        {isAllocated && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
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

        {!selectedEmployeeId && error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Papel *</Label>
        <div className="rounded-md border divide-y">
          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wide">
            Papéis orçados
          </div>
          {budgetRoles.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground italic">
              Nenhum papel orçado neste projeto
            </p>
          ) : (
            budgetRoles.map((role) => {
              const isSelected =
                !useCustomRole && selectedBudgetRoleId === role.id;
              const allocatedNames = allocatedByBudgetRole.get(role.id) ?? [];
              const allocatedLabel =
                allocatedNames.length > 0
                  ? `${allocatedNames[0].split(" ")[0]}${allocatedNames.length > 1 ? ` +${allocatedNames.length - 1}` : ""}`
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
                    "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {role.role_name}
                    {seniorityLabel(role.seniority) && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        · {seniorityLabel(role.seniority)}
                      </span>
                    )}
                  </span>
                  {allocatedLabel ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs"
                      title={allocatedNames.join(", ")}
                    >
                      {allocatedLabel}
                    </Badge>
                  ) : role.filled ? (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Já preenchido
                    </Badge>
                  ) : null}
                </button>
              );
            })
          )}

          <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wide">
            Criar papel não orçado
          </div>
          <button
            type="button"
            onClick={() => {
              setUseCustomRole(true);
              setSelectedBudgetRoleId("");
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
              useCustomRole ? "bg-primary/10 text-primary" : "hover:bg-muted",
            )}
          >
            <span className="text-primary font-medium">
              + Definir papel fora do orçamento
            </span>
          </button>

          {useCustomRole && (
            <div className="px-3 py-2">
              <Input
                placeholder="Nome do papel (ex: UX Researcher)"
                value={customRoleName}
                onChange={(e) => setCustomRoleName(e.target.value)}
                autoFocus
              />
              {customRoleName.trim().length > 0 &&
                customRoleName.trim().length < 2 && (
                  <p className="text-xs text-destructive mt-1">
                    Mínimo 2 caracteres
                  </p>
                )}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
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
  tenantId: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectMonths: ProjectMonth[];
  selectedBudgetRole: BudgetRoleWithMonths | null;
  initialHours?: Record<string, number>; // "year-month" → hours (for edit mode)
  /** Horas já salvas DESTE funcionário NESTE projeto (edição), p/ não contar duas vezes em "outros". */
  savedThisProjectHours?: Record<string, number>;
  isPending: boolean;
  onBack: () => void;
  onSubmit: (
    hours: { year: number; month: number; plannedHours: number }[],
  ) => void;
}

function formatHrs(value: number) {
  return `${Math.round(value * 10) / 10}h`;
}

interface ExistingAllocationProjectRow {
  projectId: string;
  projectName: string;
  hours: number;
  isRemainder?: boolean;
}

interface ExistingAllocationMonthRow {
  key: string;
  label: string;
  totalHours: number;
  freeHours: number;
  projects: ExistingAllocationProjectRow[];
}

function Step2({
  tenantId,
  employeeId,
  employeeName,
  projectId,
  projectMonths,
  selectedBudgetRole,
  initialHours,
  savedThisProjectHours = {},
  isPending,
  onBack,
  onSubmit,
}: Step2Props) {
  // Build initial values: pre-fill from budget role months or existing allocation
  const defaultHours: Record<string, string> = {};
  projectMonths.forEach((pm) => {
    const key = `${pm.year}-${pm.month}`;
    if (initialHours && initialHours[key] !== undefined) {
      defaultHours[key] = String(initialHours[key]);
    } else if (selectedBudgetRole) {
      const bm = selectedBudgetRole.months.find(
        (m) => m.month_number === pm.monthNumber,
      );
      defaultHours[key] = bm ? String(bm.hours) : "0";
    } else {
      defaultHours[key] = "0";
    }
  });

  const [hours, setHours] = useState<Record<string, string>>(defaultHours);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showExistingAllocations, setShowExistingAllocations] = useState(false);
  const [activeExistingMonthKey, setActiveExistingMonthKey] = useState("");

  const years = useMemo(
    () => Array.from(new Set(projectMonths.map((pm) => pm.year))),
    [projectMonths],
  );
  const { data: loadByKey = {}, isLoading: loadLoading } =
    useEmployeeMonthlyLoad({
      tenantId,
      employeeId,
      years,
      excludeProjectId: projectId,
    });

  const thisHours = (key: string) =>
    Math.max(0, parseFloat(hours[key] || "0") || 0);

  // Derived capacity stats per month + aggregate for the period.
  const monthStats = projectMonths.map((pm) => {
    const key = monthLoadKey(pm.year, pm.month);
    const load = loadByKey[key];
    const capacity = load?.capacityHours ?? 0;
    // "Outros projetos" = total planejado (resumo, completo) − horas já salvas deste projeto.
    const others = Math.max(
      0,
      Math.round((load?.totalPlanned ?? 0) - (savedThisProjectHours[key] ?? 0)),
    );
    const planned = thisHours(key);
    const total = others + planned;
    const free = capacity - total;

    // Detalhamento: projetos nomeados (legado) + resto não-itemizado, p/ o total bater com "others".
    const named = load?.byProject ?? [];
    const namedSum = named.reduce((sum, project) => sum + project.hours, 0);
    const remainder = Math.max(0, others - namedSum);

    return {
      pm,
      key,
      load,
      capacity,
      others,
      planned,
      total,
      free,
      named,
      remainder,
      over: capacity > 0 && total > capacity,
    };
  });

  const monthsWithCapacity = monthStats.filter((m) => m.capacity > 0);
  const overMonths = monthStats.filter((m) => m.over);
  const existingAllocationMonths: ExistingAllocationMonthRow[] = monthStats
    .map((stat) => {
      const projects = stat.named
        .map((project) => ({
          projectId: project.projectId,
          projectName: project.projectName,
          hours: project.hours,
        }))
        .sort((left, right) => right.hours - left.hours);

      if (stat.remainder > 0) {
        projects.push({
          projectId: `${stat.key}-remainder`,
          projectName: "Alocações sem detalhe",
          hours: stat.remainder,
          //  isRemainder: true,
        });
      }

      return {
        key: stat.key,
        label: stat.pm.label,
        totalHours: stat.others,
        freeHours: stat.capacity - stat.others,
        projects,
      };
    })
    .filter((month) => month.totalHours > 0);
  const existingTotalHours = existingAllocationMonths.reduce(
    (sum, month) => sum + month.totalHours,
    0,
  );
  const existingMonthCount = existingAllocationMonths.length;
  const activeExistingMonth =
    existingAllocationMonths.find(
      (month) => month.key === activeExistingMonthKey,
    ) ??
    existingAllocationMonths[0] ??
    null;
  const avgOccupancy = monthsWithCapacity.length
    ? Math.round(
        (monthsWithCapacity.reduce((sum, m) => sum + m.total / m.capacity, 0) /
          monthsWithCapacity.length) *
          100,
      )
    : null;

  const setHour = (key: string, val: string) => {
    // Allow only numbers and one decimal point
    const clean = val.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
    setHours((prev) => ({ ...prev, [key]: clean }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateAndClamp = (key: string) => {
    const num = parseFloat(hours[key] || "0");
    if (isNaN(num) || num < 0) {
      setHours((prev) => ({ ...prev, [key]: "0" }));
      return;
    }
    if (num > 744) {
      setErrors((prev) => ({ ...prev, [key]: "Máx 744h" }));
      setHours((prev) => ({ ...prev, [key]: "744" }));
      return;
    }
    // Round to 1 decimal
    setHours((prev) => ({ ...prev, [key]: String(Math.round(num * 10) / 10) }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      const next = projectMonths[index + 1];
      if (next) {
        inputRefs.current[`${next.year}-${next.month}`]?.focus();
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      const prev = projectMonths[index - 1];
      if (prev) {
        inputRefs.current[`${prev.year}-${prev.month}`]?.focus();
      }
    }
  };

  const replicateAll = () => {
    const first = projectMonths.find((pm) => {
      const v = parseFloat(hours[`${pm.year}-${pm.month}`] || "0");
      return v > 0;
    });
    if (!first) return;
    const val = hours[`${first.year}-${first.month}`];
    const next: Record<string, string> = {};
    projectMonths.forEach((pm) => {
      next[`${pm.year}-${pm.month}`] = val;
    });
    setHours(next);
  };

  // Reduz as horas de cada mês para caber na capacidade restante (folga após outros projetos).
  const fitToCapacity = () => {
    const next = { ...hours };
    monthStats.forEach(({ key, capacity, others, planned }) => {
      if (capacity <= 0) return;
      const free = Math.max(0, capacity - others);
      if (planned > free) next[key] = String(Math.round(free * 10) / 10);
    });
    setHours(next);
  };

  const handleSubmit = () => {
    const result = projectMonths.map((pm) => ({
      year: pm.year,
      month: pm.month,
      plannedHours: Math.max(
        0,
        parseFloat(hours[`${pm.year}-${pm.month}`] || "0") || 0,
      ),
    }));
    onSubmit(result);
  };

  return (
    <div className="min-w-0 space-y-4">
      {/* Resumo de ocupação do funcionário no período */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {employeeName}
          </p>
          <p className="text-xs text-muted-foreground">
            {loadLoading
              ? "Carregando disponibilidade…"
              : avgOccupancy !== null
                ? `Ocupação média de ${avgOccupancy}% no período (incluindo esta alocação)`
                : "Sem capacidade cadastrada para o período"}
          </p>
        </div>
        {overMonths.length > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-destructive/30 bg-destructive/10 text-destructive"
          >
            <TriangleAlert className="h-3 w-3" />
            {overMonths.length}{" "}
            {overMonths.length === 1 ? "mês acima" : "meses acima"} da
            capacidade
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Defina as horas planejadas para cada mês. A barra mostra a carga total
          do funcionário.
        </p>
        <div className="flex gap-2">
          {overMonths.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={fitToCapacity}
              className="gap-1.5 text-xs"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Preencher com horas livres
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={replicateAll}
            className="gap-1.5 text-xs"
          >
            <Copy className="h-3.5 w-3.5" />
            Replicar para todos
          </Button>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="w-full min-w-0 overflow-x-auto rounded-md border">
          <div className="flex w-max gap-2 p-3">
            {monthStats.map(
              (
                {
                  pm,
                  key,
                  capacity,
                  others,
                  planned,
                  total,
                  free,
                  named,
                  remainder,
                  over,
                },
                index,
              ) => {
                const othersPct =
                  capacity > 0 ? Math.min(100, (others / capacity) * 100) : 0;
                const thisPct =
                  capacity > 0
                    ? Math.min(100 - othersPct, (planned / capacity) * 100)
                    : 0;
                const budgetMonth = selectedBudgetRole?.months.find(
                  (m) => m.month_number === pm.monthNumber,
                );
                return (
                  <div
                    key={key}
                    className="flex min-w-[72px] flex-col items-center gap-1.5"
                  >
                    <span className="text-xs font-medium capitalize text-muted-foreground">
                      {pm.label}
                    </span>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Capacidade de ${pm.label}`}
                          className="flex h-2 w-full cursor-help overflow-hidden rounded-full bg-muted"
                        >
                          <span
                            className="h-full bg-muted-foreground/40"
                            style={{ width: `${othersPct}%` }}
                          />
                          <span
                            className={cn(
                              "h-full",
                              over ? "bg-destructive" : "bg-primary",
                            )}
                            style={{ width: `${thisPct}%` }}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        <p className="font-medium">
                          {pm.label} — capacidade{" "}
                          {capacity > 0
                            ? formatHrs(capacity)
                            : "não cadastrada"}
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs">
                          {named.length === 0 && remainder === 0 ? (
                            <li className="text-muted-foreground">
                              Sem outras alocações neste mês
                            </li>
                          ) : (
                            <>
                              {named.map((proj) => (
                                <li
                                  key={proj.projectId}
                                  className="flex justify-between gap-3"
                                >
                                  <span className="truncate">
                                    {proj.projectName}
                                  </span>
                                  <span className="font-mono tabular-nums">
                                    {formatHrs(proj.hours)}
                                  </span>
                                </li>
                              ))}
                              {remainder > 0 && (
                                <li className="flex justify-between gap-3 text-muted-foreground">
                                  <span className="truncate">
                                    Outras alocações
                                  </span>
                                  <span className="font-mono tabular-nums">
                                    {formatHrs(remainder)}
                                  </span>
                                </li>
                              )}
                            </>
                          )}
                          <li className="flex justify-between gap-3 border-t pt-0.5 font-medium">
                            <span>Este projeto</span>
                            <span className="font-mono tabular-nums">
                              {formatHrs(planned)}
                            </span>
                          </li>
                        </ul>
                        {capacity > 0 && (
                          <p
                            className={cn(
                              "mt-1 text-xs font-semibold",
                              over ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {over
                              ? `Excede ${formatHrs(total - capacity)}`
                              : `Livre ${formatHrs(free)}`}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <input
                      ref={(el) => {
                        inputRefs.current[key] = el;
                      }}
                      type="text"
                      inputMode="decimal"
                      value={hours[key] ?? "0"}
                      onChange={(e) => setHour(key, e.target.value)}
                      onBlur={() => validateAndClamp(key)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={cn(
                        "h-9 w-16 rounded-md border bg-background text-center text-sm transition-colors",
                        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary",
                        errors[key] || over
                          ? "border-destructive"
                          : "border-input",
                      )}
                    />

                    {errors[key] ? (
                      <span className="text-[10px] leading-tight text-destructive">
                        {errors[key]}
                      </span>
                    ) : over ? (
                      <span className="text-[10px] font-medium leading-tight text-destructive">
                        excede {formatHrs(total - capacity)}
                      </span>
                    ) : capacity > 0 ? (
                      <span className="text-[10px] leading-tight text-muted-foreground">
                        livre {formatHrs(free)}
                      </span>
                    ) : budgetMonth ? (
                      <span className="text-[10px] leading-tight text-muted-foreground">
                        orç. {budgetMonth.hours}h
                      </span>
                    ) : (
                      <span className="text-[10px] leading-tight text-transparent">
                        —
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />{" "}
          Outros projetos
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary" /> Este projeto
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-destructive" /> Acima da
          capacidade
        </span>
      </div>

      <Collapsible
        open={showExistingAllocations}
        onOpenChange={setShowExistingAllocations}
        className="rounded-lg border bg-card"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Alocações existentes
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {loadLoading
                  ? "Carregando projetos já planejados..."
                  : existingTotalHours > 0
                    ? `${formatHrs(existingTotalHours)} distribuídas em ${existingMonthCount} mês${existingMonthCount === 1 ? "" : "es"}`
                    : "Sem outras alocações no período"}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                showExistingAllocations && "rotate-180",
              )}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="border-t px-3 pb-3 pt-2">
          {loadLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded-md bg-muted" />
              <div className="h-10 animate-pulse rounded-md bg-muted" />
            </div>
          ) : existingAllocationMonths.length === 0 ? (
            <p className="rounded-md bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
              Este colaborador não tem outras horas planejadas na janela do
              projeto.
            </p>
          ) : (
            <Tabs
              value={activeExistingMonth?.key}
              onValueChange={setActiveExistingMonthKey}
              className="space-y-3"
            >
              <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList className="h-auto w-max justify-start gap-1 rounded-md bg-muted/50 p-1">
                  {existingAllocationMonths.map((month) => {
                    const isOverCapacity = month.freeHours < 0;
                    return (
                      <TabsTrigger
                        key={month.key}
                        value={month.key}
                        className={cn(
                          "h-auto min-w-[86px] flex-col items-start gap-0.5 rounded px-2.5 py-1.5 text-left",
                          "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                        )}
                      >
                        <span className="text-xs font-semibold capitalize leading-none">
                          {month.label}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[11px] font-medium tabular-nums leading-tight",
                            isOverCapacity
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatHrs(month.totalHours)}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              {existingAllocationMonths.map((month) => (
                <TabsContent key={month.key} value={month.key} className="mt-0">
                  <div className="rounded-md border bg-background">
                    <div className="flex items-start justify-between gap-3 border-b px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold capitalize text-foreground">
                          {month.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {month.projects.length} alocação
                          {month.projects.length === 1 ? "" : "ões"} existente
                          {month.projects.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatHrs(month.totalHours)}
                        </p>
                        <p
                          className={cn(
                            "text-[11px]",
                            month.freeHours < 0
                              ? "text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {month.freeHours < 0
                            ? `${formatHrs(Math.abs(month.freeHours))} acima`
                            : `${formatHrs(month.freeHours)} livre antes desta alocação`}
                        </p>
                      </div>
                    </div>

                    <div className="max-h-44 space-y-1.5 overflow-y-auto p-2">
                      {month.projects.map((project) => (
                        <div
                          key={project.projectId}
                          className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-2.5 py-1.5"
                        >
                          <span className="min-w-0 truncate text-sm text-foreground">
                            {project.projectName}
                          </span>
                          <Badge
                            variant="secondary"
                            className="shrink-0 rounded-md font-mono text-[11px] font-medium tabular-nums"
                          >
                            {formatHrs(project.hours)}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {month.projects.some((project) => project.isRemainder) && (
                      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                        Horas preservadas do resumo mensal sem detalhe por
                        projeto.
                      </p>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CollapsibleContent>
      </Collapsible>

      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Voltar
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Alocando..." : "Alocar"}
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
  const { data: employees = [] } = useEmployees();
  const { budgetRoles } = useProjectBudgetRoles(project.budget_id, project.id);
  const projectMonths = useMemo(
    () => buildProjectMonths(project.start_date, project.end_date),
    [project.start_date, project.end_date],
  );

  const [step, setStep] = useState<1 | 2>(editAllocation ? 2 : 1);
  const [step1Values, setStep1Values] = useState<Step1Values | null>(
    editAllocation
      ? {
          employeeId: editAllocation.employeeId,
          budgetRoleId: editAllocation.budgetRoleId ?? undefined,
          customRoleName: editAllocation.customRoleName ?? undefined,
        }
      : null,
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

  const handleStep2Submit = (
    monthlyHours: { year: number; month: number; plannedHours: number }[],
  ) => {
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
    ? (budgetRoles.find((r) => r.id === step1Values.budgetRoleId) ?? null)
    : null;

  const employeeName = step1Values
    ? (employees.find((e) => e.id === step1Values.employeeId)?.nome ??
      editAllocation?.employee.nome ??
      "Funcionário")
    : "";

  // Build initialHours map for edit mode
  const initialHours = editAllocation
    ? Object.fromEntries(
        editAllocation.monthlyHours.map((mh) => [
          `${mh.year}-${mh.month}`,
          mh.plannedHours,
        ]),
      )
    : undefined;

  const isEdit = !!editAllocation;
  const titleMap = {
    1: "Alocar Funcionário — Passo 1 de 2",
    2: isEdit ? "Editar Jornada" : "Alocar Funcionário — Passo 2 de 2",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{titleMap[step]}</DialogTitle>
        </DialogHeader>

        {!isEdit && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn("font-medium", step === 1 && "text-foreground")}
            >
              1. Funcionário e papel
            </span>
            <ChevronRight className="w-3 h-3" />
            <span
              className={cn("font-medium", step === 2 && "text-foreground")}
            >
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

        {step === 2 && step1Values && (
          <Step2
            tenantId={project.tenant_id}
            employeeId={step1Values.employeeId}
            employeeName={employeeName}
            projectId={project.id}
            projectMonths={projectMonths}
            selectedBudgetRole={selectedBudgetRole}
            initialHours={initialHours}
            savedThisProjectHours={editAllocation ? initialHours : {}}
            isPending={addAllocation.isPending}
            onBack={() => setStep(1)}
            onSubmit={handleStep2Submit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
