import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Truck, DollarSign } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectSupplierDB, CreateProjectSupplierInput } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useAddProjectSupplier, useRemoveProjectSupplier } from '@/hooks/useProjectCosts';
import { useProjectSupplierMonths, useUpsertSupplierMonth } from '@/hooks/useProjectSupplierMonths';
import { ProjectSupplierActualDB, useUpsertSupplierActual } from '@/hooks/useProjectSupplierActuals';

interface ProjectSuppliersSectionProps {
  projectId: string;
  suppliers: ProjectSupplierDB[];
  durationMonths: number;
  isEditable: boolean;
  supplierActuals?: ProjectSupplierActualDB[];
}

export function ProjectSuppliersSection({
  projectId,
  suppliers,
  durationMonths,
  isEditable,
  supplierActuals = [],
}: ProjectSuppliersSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const upsertSupplierActual = useUpsertSupplierActual();

  // Local state for debounced planned value input
  const [localValues, setLocalValues] = useState<Record<string, number>>({});
  const pendingUpdates = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Local state for debounced actual value input
  const [localActualValues, setLocalActualValues] = useState<Record<string, number>>({});
  const pendingActualUpdates = useRef<Record<string, NodeJS.Timeout>>({});

  // Sync local state when supplierMonths change
  useEffect(() => {
    const initial: Record<string, number> = {};
    supplierMonths.forEach((sm) => {
      const key = `${sm.project_supplier_id}-${sm.month_number}`;
      initial[key] = sm.value;
    });
    setLocalValues(initial);
  }, [supplierMonths]);

  // Sync local state when supplierActuals change
  useEffect(() => {
    const initial: Record<string, number> = {};
    supplierActuals.forEach((sa) => {
      const key = `${sa.project_supplier_id}-${sa.month_number}`;
      initial[key] = sa.value;
    });
    setLocalActualValues(initial);
  }, [supplierActuals]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdates.current).forEach(clearTimeout);
      Object.values(pendingActualUpdates.current).forEach(clearTimeout);
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

  // Get ACTUAL value prioritizing local state
  const getActualValueForMonth = useCallback(
    (supplierId: string, monthNumber: number): number => {
      const key = `${supplierId}-${monthNumber}`;
      if (key in localActualValues) {
        return localActualValues[key];
      }
      const found = supplierActuals.find(
        (sa) => sa.project_supplier_id === supplierId && sa.month_number === monthNumber
      );
      return found?.value || 0;
    },
    [localActualValues, supplierActuals]
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

  // Debounced ACTUAL value change handler
  const handleActualValueChange = useCallback(
    (supplierId: string, monthNumber: number, value: number) => {
      const key = `${supplierId}-${monthNumber}`;

      // Update local state immediately (no lag)
      setLocalActualValues((prev) => ({ ...prev, [key]: value }));

      // Cancel previous timeout if exists
      if (pendingActualUpdates.current[key]) {
        clearTimeout(pendingActualUpdates.current[key]);
      }

      // Schedule save with 500ms debounce
      pendingActualUpdates.current[key] = setTimeout(() => {
        upsertSupplierActual.mutate({
          projectSupplierId: supplierId,
          monthNumber,
          value: value || 0,
        });
        delete pendingActualUpdates.current[key];
      }, 500);
    },
    [upsertSupplierActual]
  );

  const handleSubmit = () => {
    addSupplier.mutate(
      { projectId, ...formData },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData({ name: '', description: '', monthlyValue: 0, startMonth: 1, endMonth: undefined });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    removeSupplier.mutate({ id, projectId });
  };

  // Calculate totals (Planned and Actual)
  const totals = useMemo(() => {
    const byMonth: Record<number, { planned: number; actual: number }> = {};
    let totalPlanned = 0;
    let totalActual = 0;

    months.forEach((m) => {
      byMonth[m] = { planned: 0, actual: 0 };
    });

    suppliers.forEach((supplier) => {
      months.forEach((monthNum) => {
        const planned = getValueForMonth(supplier.id, monthNum);
        const actual = getActualValueForMonth(supplier.id, monthNum);
        byMonth[monthNum].planned += planned;
        byMonth[monthNum].actual += actual;
        totalPlanned += planned;
        totalActual += actual;
      });
    });

    return { byMonth, totalPlanned, totalActual };
  }, [suppliers, months, getValueForMonth, getActualValueForMonth]);

  // Calculate supplier totals (Planned and Actual)
  const supplierTotals = useMemo(() => {
    const result: Record<string, { planned: number; actual: number }> = {};
    suppliers.forEach((supplier) => {
      let totalPlanned = 0;
      let totalActual = 0;
      months.forEach((monthNum) => {
        totalPlanned += getValueForMonth(supplier.id, monthNum);
        totalActual += getActualValueForMonth(supplier.id, monthNum);
      });
      result[supplier.id] = { planned: totalPlanned, actual: totalActual };
    });
    return result;
  }, [suppliers, months, getValueForMonth, getActualValueForMonth]);

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
          {isEditable && (
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
                        Nome
                      </TableHead>
                      {months.map((m) => (
                        <TableHead key={m} className="text-center min-w-[180px]">
                          <div className="flex flex-col">
                            <span>Mês {m}</span>
                            {!isEditable && (
                              <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[160px]">
                        <div className="flex flex-col">
                          <span>Total</span>
                          <span className="text-xs font-normal text-muted-foreground">Plan | Real</span>
                        </div>
                      </TableHead>
                      {isEditable && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => {
                      const supplierTotal = supplierTotals[supplier.id] || { planned: 0, actual: 0 };

                      return (
                        <TableRow key={supplier.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div>
                              <p>{supplier.name}</p>
                              {supplier.description && (
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
                              <TableCell key={monthNum} className="text-center p-1">
                                {isEditable ? (
                                  <div className="flex flex-col gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="w-24 h-8 text-center mx-auto"
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
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                                            <Input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="w-20 h-7 text-center text-xs bg-muted/50"
                                              placeholder="Real"
                                              value={actualValue || ''}
                                              onChange={(e) =>
                                                handleActualValueChange(
                                                  supplier.id,
                                                  monthNum,
                                                  Number(e.target.value)
                                                )
                                              }
                                            />
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>Valor Realizado</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1 text-sm">
                                    <span className="text-muted-foreground">
                                      {plannedValue ? formatCurrency(plannedValue) : '-'}
                                    </span>
                                    <span className="text-muted-foreground">|</span>
                                    <span className="font-medium">
                                      {actualValue ? formatCurrency(actualValue) : '-'}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <span className="text-muted-foreground">{formatCurrency(supplierTotal.planned)}</span>
                              <span className="text-muted-foreground">|</span>
                              <span className="font-medium">{formatCurrency(supplierTotal.actual)}</span>
                            </div>
                          </TableCell>
                          {isEditable && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(supplier.id)}
                                disabled={removeSupplier.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
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
                        const monthData = totals.byMonth[monthNum] || { planned: 0, actual: 0 };
                        return (
                          <TableCell key={monthNum} className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm">
                              <span className="text-muted-foreground">{formatCurrency(monthData.planned)}</span>
                              <span className="text-muted-foreground">|</span>
                              <span className="font-medium">{formatCurrency(monthData.actual)}</span>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <span className="text-muted-foreground">{formatCurrency(totals.totalPlanned)}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="font-semibold">{formatCurrency(totals.totalActual)}</span>
                        </div>
                      </TableCell>
                      {isEditable && <TableCell />}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fornecedor</DialogTitle>
            <DialogDescription>
              Adicione um fornecedor. Depois defina os valores por mês na tabela.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Fornecedor</Label>
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
                placeholder="Descreva o serviço prestado"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || addSupplier.isPending}>
              {addSupplier.isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
