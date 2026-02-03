import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Truck } from 'lucide-react';
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
import { ProjectSupplierDB, CreateProjectSupplierInput } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { useAddProjectSupplier, useRemoveProjectSupplier } from '@/hooks/useProjectCosts';
import { useProjectSupplierMonths, useUpsertSupplierMonth } from '@/hooks/useProjectSupplierMonths';

interface ProjectSuppliersSectionProps {
  projectId: string;
  suppliers: ProjectSupplierDB[];
  durationMonths: number;
  isEditable: boolean;
}

export function ProjectSuppliersSection({
  projectId,
  suppliers,
  durationMonths,
  isEditable,
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

  const months = useMemo(() => {
    return Array.from({ length: durationMonths }, (_, i) => i + 1);
  }, [durationMonths]);

  const getValueForMonth = useCallback(
    (supplierId: string, monthNumber: number): number => {
      const found = supplierMonths.find(
        (sm) => sm.project_supplier_id === supplierId && sm.month_number === monthNumber
      );
      return found?.value || 0;
    },
    [supplierMonths]
  );

  const handleValueChange = useCallback(
    (supplierId: string, monthNumber: number, value: number) => {
      upsertSupplierMonth.mutate({
        projectSupplierId: supplierId,
        monthNumber,
        value: value || 0,
      });
    },
    [upsertSupplierMonth]
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

  // Calculate totals
  const totals = useMemo(() => {
    const byMonth: Record<number, number> = {};
    let totalValue = 0;

    months.forEach((m) => {
      byMonth[m] = 0;
    });

    suppliers.forEach((supplier) => {
      months.forEach((monthNum) => {
        const value = getValueForMonth(supplier.id, monthNum);
        byMonth[monthNum] += value;
        totalValue += value;
      });
    });

    return { byMonth, totalValue };
  }, [suppliers, months, getValueForMonth]);

  // Calculate supplier totals
  const supplierTotals = useMemo(() => {
    const result: Record<string, number> = {};
    suppliers.forEach((supplier) => {
      let total = 0;
      months.forEach((monthNum) => {
        total += getValueForMonth(supplier.id, monthNum);
      });
      result[supplier.id] = total;
    });
    return result;
  }, [suppliers, months, getValueForMonth]);

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
                        <TableHead key={m} className="text-center min-w-[100px]">
                          Mês {m}
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[120px]">Total</TableHead>
                      {isEditable && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.map((supplier) => {
                      const supplierTotal = supplierTotals[supplier.id] || 0;

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
                          {months.map((monthNum) => (
                            <TableCell key={monthNum} className="text-center p-1">
                              {isEditable ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className="w-24 h-8 text-center mx-auto"
                                  value={getValueForMonth(supplier.id, monthNum) || ''}
                                  onChange={(e) =>
                                    handleValueChange(
                                      supplier.id,
                                      monthNum,
                                      Number(e.target.value)
                                    )
                                  }
                                />
                              ) : (
                                <span>
                                  {getValueForMonth(supplier.id, monthNum)
                                    ? formatCurrency(getValueForMonth(supplier.id, monthNum))
                                    : '-'}
                                </span>
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-medium">
                            {formatCurrency(supplierTotal)}
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
                      {months.map((monthNum) => (
                        <TableCell key={monthNum} className="text-center font-medium">
                          {formatCurrency(totals.byMonth[monthNum] || 0)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totals.totalValue)}
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
