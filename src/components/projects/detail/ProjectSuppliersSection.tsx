import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Truck, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectSupplierDB, CreateProjectSupplierInput } from '@/types/project';
import { BudgetSupplierDB } from '@/types/budget';
import { Supplier } from '@/types/supplier';
import { formatCurrency } from '@/lib/formatters';
import { useAddProjectSupplier, useRemoveProjectSupplier } from '@/hooks/useProjectCosts';
import { useProjectSupplierMonths, useUpsertSupplierMonth } from '@/hooks/useProjectSupplierMonths';
import { ProjectSupplierActualDB } from '@/hooks/useProjectSupplierActuals';
import { SupplierActualDialog } from './SupplierActualDialog';
import { cn } from '@/lib/utils';

interface ProjectSuppliersSectionProps {
  projectId: string;
  suppliers: ProjectSupplierDB[];
  durationMonths: number;
  isEditable: boolean;
  canEditActuals?: boolean;
  supplierActuals?: ProjectSupplierActualDB[];
  budgetSuppliers: BudgetSupplierDB[];
  availableSuppliers: Supplier[];
}

export function ProjectSuppliersSection({
  projectId,
  suppliers,
  durationMonths,
  isEditable,
  canEditActuals = false,
  supplierActuals = [],
  budgetSuppliers,
  availableSuppliers,
}: ProjectSuppliersSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actualDialogOpen, setActualDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<ProjectSupplierDB | null>(null);
  const [selectedBudgetSupplier, setSelectedBudgetSupplier] = useState<string>('');
  const [selectedRegistrySupplier, setSelectedRegistrySupplier] = useState<string>('');
  const [formData, setFormData] = useState<Omit<CreateProjectSupplierInput, 'projectId'>>({
    name: '',
    description: '',
    monthlyValue: 0,
    startMonth: 1,
    endMonth: undefined,
  });

  const addSupplier = useAddProjectSupplier();
  const removeSupplier = useRemoveProjectSupplier();

  const supplierIds = useMemo(() => suppliers.map((s) => s.id), [suppliers]);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const upsertSupplierMonth = useUpsertSupplierMonth();

  // Local state for debounced planned value input
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const pendingUpdates = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync local state when supplierMonths change
  useEffect(() => {
    const initial: Record<string, number> = {};
    supplierMonths.forEach((sm) => {
      const key = `${sm.project_supplier_id}-${sm.month_number}`;
      initial[key] = sm.value;
    });
    setLocalValues(initial);
  }, [supplierMonths]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdates.current).forEach(clearTimeout);
    };
  }, []);

  const months = useMemo(() => {
    return Array.from({ length: durationMonths }, (_, i) => i + 1);
  }, [durationMonths]);

  // Get PLANNED value prioritizing local state
  const getValueForMonth = useCallback(
    (supplierId: string, monthNumber: number): number => {
      const key = `${supplierId}-${monthNumber}`;
      if (key in localValues) {
        return localValues[key];
      }
      const found = supplierMonths.find(
        (sm) => sm.project_supplier_id === supplierId && sm.month_number === monthNumber
      );
      return found?.value || 0;
    },
    [localValues, supplierMonths]
  );

  // Get ACTUAL value from supplierActuals
  const getActualValueForMonth = useCallback(
    (supplierId: string, monthNumber: number): number => {
      const found = supplierActuals.find(
        (sa) => sa.project_supplier_id === supplierId && sa.month_number === monthNumber
      );
      return found?.value || 0;
    },
    [supplierActuals]
  );

  // Get BUDGETED value for a supplier
  const getBudgetedValueForSupplier = useCallback(
    (projectSupplier: ProjectSupplierDB): number => {
      if (!projectSupplier.budget_supplier_id) return 0;
      const budgetSupplier = budgetSuppliers.find(bs => bs.id === projectSupplier.budget_supplier_id);
      return budgetSupplier?.monthly_value || 0;
    },
    [budgetSuppliers]
  );

  // Debounced PLANNED value change handler
  const handleValueChange = useCallback(
    (supplierId: string, monthNumber: number, value: number) => {
      const key = `${supplierId}-${monthNumber}`;

      // Update local state immediately (no lag)
      setLocalValues((prev) => ({ ...prev, [key]: value }));

      // Cancel previous timeout if exists
      if (pendingUpdates.current[key]) {
        clearTimeout(pendingUpdates.current[key]);
      }

      // Schedule save with 500ms debounce
      pendingUpdates.current[key] = setTimeout(() => {
        upsertSupplierMonth.mutate({
          projectSupplierId: supplierId,
          monthNumber,
          value: value || 0,
        });
        delete pendingUpdates.current[key];
      }, 500);
    },
    [upsertSupplierMonth]
  );

  // Handle budget supplier selection
  const handleBudgetSupplierSelect = (budgetSupplierId: string) => {
    setSelectedBudgetSupplier(budgetSupplierId);
    setSelectedRegistrySupplier('');
    
    if (budgetSupplierId) {
      const bs = budgetSuppliers.find(s => s.id === budgetSupplierId);
      if (bs) {
        setFormData({
          ...formData,
          name: bs.name,
          description: bs.description || '',
          monthlyValue: bs.monthly_value,
          budgetSupplierId,
        });
      }
    }
  };

  // Handle registry supplier selection
  const handleRegistrySupplierSelect = (supplierId: string) => {
    setSelectedRegistrySupplier(supplierId);
    setSelectedBudgetSupplier('');
    
    if (supplierId) {
      const supplier = availableSuppliers.find(s => s.id === supplierId);
      if (supplier) {
        setFormData({
          ...formData,
          name: supplier.tradingName || supplier.companyName,
          description: '',
          monthlyValue: 0,
          supplierId,
        });
      }
    }
  };

  const handleSubmit = () => {
    addSupplier.mutate(
      { 
        projectId, 
        ...formData,
        budgetSupplierId: selectedBudgetSupplier || undefined,
        supplierId: selectedRegistrySupplier || undefined,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData({ name: '', description: '', monthlyValue: 0, startMonth: 1, endMonth: undefined });
          setSelectedBudgetSupplier('');
          setSelectedRegistrySupplier('');
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    removeSupplier.mutate({ id, projectId });
  };

  const openActualDialog = (supplier: ProjectSupplierDB) => {
    setSelectedSupplier(supplier);
    setActualDialogOpen(true);
  };

  // Calculate totals (Planned, Actual, and Budgeted)
  const totals = useMemo(() => {
    const byMonth: Record<number, { planned: number; actual: number; budgeted: number }> = {};
    let totalPlanned = 0;
    let totalActual = 0;
    let totalBudgeted = 0;

    months.forEach((m) => {
      byMonth[m] = { planned: 0, actual: 0, budgeted: 0 };
    });

    suppliers.forEach((supplier) => {
      const budgetedMonthly = getBudgetedValueForSupplier(supplier);
      
      months.forEach((monthNum) => {
        const planned = getValueForMonth(supplier.id, monthNum);
        const actual = getActualValueForMonth(supplier.id, monthNum);
        byMonth[monthNum].planned += planned;
        byMonth[monthNum].actual += actual;
        byMonth[monthNum].budgeted += budgetedMonthly;
        totalPlanned += planned;
        totalActual += actual;
      });
      
      totalBudgeted += budgetedMonthly * durationMonths;
    });

    return { byMonth, totalPlanned, totalActual, totalBudgeted };
  }, [suppliers, months, getValueForMonth, getActualValueForMonth, getBudgetedValueForSupplier, durationMonths]);

  // Calculate total budgeted from budget (for footer comparison)
  const totalBudgetedFromBudget = useMemo(() => {
    return budgetSuppliers.reduce((acc, bs) => acc + Number(bs.monthly_value) * durationMonths, 0);
  }, [budgetSuppliers, durationMonths]);

  // Calculate variation percentage
  const variation = useMemo(() => {
    if (totalBudgetedFromBudget === 0) return { percent: 0, isUnder: true };
    const diff = totals.totalPlanned - totalBudgetedFromBudget;
    return {
      percent: Math.abs(diff / totalBudgetedFromBudget) * 100,
      isUnder: diff <= 0,
    };
  }, [totals.totalPlanned, totalBudgetedFromBudget]);

  // Calculate supplier totals (Planned, Actual, and Budgeted)
  const supplierTotals = useMemo(() => {
    const result: Record<string, { planned: number; actual: number; budgeted: number }> = {};
    suppliers.forEach((supplier) => {
      let totalPlanned = 0;
      let totalActual = 0;
      const budgetedMonthly = getBudgetedValueForSupplier(supplier);
      
      months.forEach((monthNum) => {
        totalPlanned += getValueForMonth(supplier.id, monthNum);
        totalActual += getActualValueForMonth(supplier.id, monthNum);
      });
      
      result[supplier.id] = { 
        planned: totalPlanned, 
        actual: totalActual,
        budgeted: budgetedMonthly * durationMonths,
      };
    });
    return result;
  }, [suppliers, months, getValueForMonth, getActualValueForMonth, getBudgetedValueForSupplier, durationMonths]);

  // Filter out already used budget suppliers
  const unusedBudgetSuppliers = useMemo(() => {
    const usedIds = suppliers
      .map(s => s.budget_supplier_id)
      .filter((id): id is string => id !== null);
    return budgetSuppliers.filter(bs => !usedIds.includes(bs.id));
  }, [budgetSuppliers, suppliers]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fornecedores
            </CardTitle>
            <CardDescription>
              Custos mensais recorrentes com fornecedores externos
            </CardDescription>
          </div>
          {(isEditable || canEditActuals) && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Fornecedor
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {suppliers.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                        Fornecedor
                      </TableHead>
                      {months.map((m) => (
                        <TableHead key={m} className="text-center min-w-[100px]">
                          <div className="flex flex-col">
                            <span>Mês {m}</span>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[120px]">
                        Total
                      </TableHead>
                      {(isEditable || canEditActuals) && <TableHead className="w-28">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => {
                      const supplierTotal = supplierTotals[supplier.id] || { planned: 0, actual: 0, budgeted: 0 };
                      const budgetedMonthly = getBudgetedValueForSupplier(supplier);
                      const linkedSupplier = availableSuppliers.find(s => s.id === supplier.supplier_id);

                      return (
                        <TableRow key={supplier.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div className="space-y-0.5">
                              {/* Supplier name from registry */}
                              <p className="font-medium">
                                {linkedSupplier?.tradingName || linkedSupplier?.companyName || supplier.name}
                              </p>
                              {/* Service name below (from budget) */}
                              {supplier.budget_supplier_id && (
                                <p className="text-xs text-muted-foreground">
                                  {supplier.name}
                                </p>
                              )}
                              {supplier.description && !supplier.budget_supplier_id && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {supplier.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          {months.map((monthNum) => {
                            const plannedValue = getValueForMonth(supplier.id, monthNum);
                            const actualValue = getActualValueForMonth(supplier.id, monthNum);
                            
                            return (
                              <TableCell key={monthNum} className="text-center p-2">
                                {isEditable ? (
                                  // Planning mode: show planned input with budgeted below
                                  <div className="flex flex-col gap-0.5 items-center">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-20 h-8 text-center mx-auto"
                                            value={plannedValue || ''}
                                            onChange={(e) =>
                                              handleValueChange(
                                                supplier.id,
                                                monthNum,
                                                Number(e.target.value)
                                              )
                                            }
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent>Valor Planejado</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    {budgetedMonthly > 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatCurrency(budgetedMonthly)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  // Execution mode: show read-only Plan | Real
                                  <div className="flex items-center justify-center gap-1 text-sm">
                                    <span className="text-muted-foreground">
                                      {plannedValue ? formatCurrency(plannedValue) : '-'}
                                    </span>
                                    <span className="text-muted-foreground">|</span>
                                    <span className={actualValue > 0 ? 'font-medium' : 'text-muted-foreground'}>
                                      {actualValue ? formatCurrency(actualValue) : '-'}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            {isEditable ? (
                              // Planning mode: show planned total with budgeted below
                              <div className="flex flex-col gap-0.5 items-center">
                                <span className="font-medium">{formatCurrency(supplierTotal.planned)}</span>
                                {supplierTotal.budgeted > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(supplierTotal.budgeted)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              // Execution mode: Plan | Real
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <span className="text-muted-foreground">{formatCurrency(supplierTotal.planned)}</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="font-medium">{formatCurrency(supplierTotal.actual)}</span>
                              </div>
                            )}
                          </TableCell>
                          {(isEditable || canEditActuals) && (
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {canEditActuals && !isEditable && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => openActualDialog(supplier)}
                                        >
                                          <DollarSign className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Lançar custo realizado</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {(isEditable || canEditActuals) && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(supplier.id)}
                                    disabled={removeSupplier.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-muted z-10 font-semibold">
                        Total
                      </TableCell>
                      {months.map((monthNum) => {
                        const monthData = totals.byMonth[monthNum] || { planned: 0, actual: 0, budgeted: 0 };
                        return (
                          <TableCell key={monthNum} className="text-center">
                            {isEditable ? (
                              // Planning mode: show planned with budgeted below
                              <div className="flex flex-col gap-0.5 items-center">
                                <span className="font-medium">{formatCurrency(monthData.planned)}</span>
                                {monthData.budgeted > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    {formatCurrency(monthData.budgeted)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              // Execution mode: Plan | Real
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <span className="text-muted-foreground">{formatCurrency(monthData.planned)}</span>
                                <span className="text-muted-foreground">|</span>
                                <span className="font-medium">{formatCurrency(monthData.actual)}</span>
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {isEditable ? (
                          // Planning mode: show planned with budgeted below
                          <div className="flex flex-col gap-0.5 items-center">
                            <span className="font-semibold">{formatCurrency(totals.totalPlanned)}</span>
                            {totalBudgetedFromBudget > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(totalBudgetedFromBudget)}
                              </span>
                            )}
                          </div>
                        ) : (
                          // Execution mode: Plan | Real
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <span className="text-muted-foreground">{formatCurrency(totals.totalPlanned)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="font-semibold">{formatCurrency(totals.totalActual)}</span>
                          </div>
                        )}
                      </TableCell>
                      {(isEditable || canEditActuals) && (
                        <TableCell>
                          {/* Variation indicator in planning mode */}
                          {isEditable && totalBudgetedFromBudget > 0 && (
                            <div className="flex items-center gap-1">
                              {variation.isUnder ? (
                                <>
                                  <TrendingDown className="h-4 w-4 text-green-600" />
                                  <span className="text-xs font-medium text-green-600">
                                    -{variation.percent.toFixed(0)}%
                                  </span>
                                </>
                              ) : variation.percent > 0 ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-destructive" />
                                  <span className="text-xs font-medium text-destructive">
                                    +{variation.percent.toFixed(0)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Minus className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">0%</span>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              Nenhum fornecedor cadastrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Add Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Fornecedor</DialogTitle>
            <DialogDescription>
              Selecione um fornecedor do orçamento, do cadastro ou digite manualmente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Budget Supplier Selector */}
            {unusedBudgetSuppliers.length > 0 && (
              <div className="space-y-2">
                <Label>Do Orçamento</Label>
                <Select value={selectedBudgetSupplier} onValueChange={handleBudgetSupplierSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço do orçamento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unusedBudgetSuppliers.map((bs) => (
                      <SelectItem key={bs.id} value={bs.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{bs.name}</span>
                          <span className="text-muted-foreground text-sm">
                            {formatCurrency(bs.monthly_value)}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Registry Supplier Selector */}
            {availableSuppliers.length > 0 && (
              <div className="space-y-2">
                <Label>Do Cadastro</Label>
                <Select value={selectedRegistrySupplier} onValueChange={handleRegistrySupplierSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor cadastrado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSuppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        <div className="flex items-center justify-between gap-4">
                          <span>{supplier.tradingName || supplier.companyName}</span>
                          {supplier.category && (
                            <span className="text-muted-foreground text-sm">
                              {supplier.category}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Divider */}
            {(unusedBudgetSuppliers.length > 0 || availableSuppliers.length > 0) && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">ou digite manualmente</span>
                </div>
              </div>
            )}

            {/* Manual Input */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fornecedor/Serviço</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Agência de Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição do Serviço</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional do serviço"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyValue">Valor Mensal Inicial (R$)</Label>
              <Input
                id="monthlyValue"
                type="number"
                min="0"
                step="0.01"
                value={formData.monthlyValue || ''}
                onChange={(e) => setFormData({ ...formData, monthlyValue: Number(e.target.value) })}
                placeholder="0,00"
              />
              <p className="text-xs text-muted-foreground">
                Você poderá ajustar os valores por mês na tabela depois.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || addSupplier.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Actual Dialog */}
      {selectedSupplier && (
        <SupplierActualDialog
          open={actualDialogOpen}
          onOpenChange={setActualDialogOpen}
          supplier={selectedSupplier}
          durationMonths={durationMonths}
          existingActuals={supplierActuals.filter(sa => sa.project_supplier_id === selectedSupplier.id)}
          getPlannedValueForMonth={getValueForMonth}
        />
      )}
    </>
  );
}