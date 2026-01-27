import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeBenefit } from '@/types/employee';
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import {
  useEmployeeBenefits,
  useAddEmployeeBenefit,
  useUpdateEmployeeBenefit,
  useDeleteEmployeeBenefit,
} from '@/hooks/useEmployees';
import { Plus, Pencil, Trash2, Check, X, Heart } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EmployeeBenefitsTableProps {
  employeeId: string;
  employeeName: string;
}

export function EmployeeBenefitsTable({ employeeId, employeeName }: EmployeeBenefitsTableProps) {
  const { data: benefits = [], isLoading } = useEmployeeBenefits(employeeId);
  const addBenefit = useAddEmployeeBenefit();
  const updateBenefit = useUpdateEmployeeBenefit();
  const deleteBenefit = useDeleteEmployeeBenefit();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteBenefitId, setDeleteBenefitId] = useState<string | null>(null);
  
  const [newBenefit, setNewBenefit] = useState({
    name: '',
    description: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const totalValue = benefits.reduce((sum, benefit) => sum + Number(benefit.monthly_value), 0);

  const handleAdd = () => {
    if (!newBenefit.name.trim()) return;
    
    addBenefit.mutate(
      {
        employeeId,
        name: newBenefit.name.trim(),
        description: newBenefit.description.trim() || undefined,
        monthlyValue: newBenefit.monthlyValue,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewBenefit({ name: '', description: '', monthlyValue: 0, monthlyValueDisplay: '' });
        },
      }
    );
  };

  const startEdit = (benefit: EmployeeBenefit) => {
    setEditingId(benefit.id);
    setEditData({
      name: benefit.name,
      description: benefit.description || '',
      monthlyValue: Number(benefit.monthly_value),
      monthlyValueDisplay: formatCurrencyMask(Number(benefit.monthly_value)),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: '', description: '', monthlyValue: 0, monthlyValueDisplay: '' });
  };

  const saveEdit = (id: string) => {
    if (!editData.name.trim()) return;
    
    updateBenefit.mutate(
      {
        id,
        employeeId,
        updates: {
          name: editData.name.trim(),
          description: editData.description.trim() || undefined,
          monthlyValue: editData.monthlyValue,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteBenefitId) return;
    
    deleteBenefit.mutate(
      { id: deleteBenefitId, employeeId },
      {
        onSuccess: () => {
          setDeleteBenefitId(null);
        },
      }
    );
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Carregando...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Benefícios
          </CardTitle>
          <CardDescription>
            Benefícios mensais de {employeeName}
          </CardDescription>
        </div>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {benefits.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum benefício cadastrado para este funcionário.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefício</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor Mensal</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdding && (
                    <TableRow>
                      <TableCell>
                        <Input
                          value={newBenefit.name}
                          onChange={(e) => setNewBenefit({ ...newBenefit, name: e.target.value })}
                          placeholder="Ex: Vale Refeição, Plano de Saúde..."
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newBenefit.description}
                          onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                          placeholder="Descrição (opcional)"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={newBenefit.monthlyValueDisplay}
                          onChange={(e) => {
                            const formatted = formatCurrencyMask(e.target.value);
                            setNewBenefit({
                              ...newBenefit,
                              monthlyValueDisplay: formatted,
                              monthlyValue: parseCurrency(formatted),
                            });
                          }}
                          placeholder="R$ 0,00"
                          className="w-[140px] text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleAdd}
                            disabled={addBenefit.isPending || !newBenefit.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              setNewBenefit({ name: '', description: '', monthlyValue: 0, monthlyValueDisplay: '' });
                            }}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {benefits.map((benefit) => (
                    <TableRow key={benefit.id}>
                      <TableCell>
                        {editingId === benefit.id ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          <span className="font-medium">{benefit.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === benefit.id ? (
                          <Input
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="w-full"
                          />
                        ) : (
                          <span className="text-muted-foreground">{benefit.description || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === benefit.id ? (
                          <Input
                            value={editData.monthlyValueDisplay}
                            onChange={(e) => {
                              const formatted = formatCurrencyMask(e.target.value);
                              setEditData({
                                ...editData,
                                monthlyValueDisplay: formatted,
                                monthlyValue: parseCurrency(formatted),
                              });
                            }}
                            className="w-[140px] text-right"
                          />
                        ) : (
                          formatCurrency(Number(benefit.monthly_value))
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === benefit.id ? (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveEdit(benefit.id)}
                              disabled={updateBenefit.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => startEdit(benefit)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteBenefitId(benefit.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {benefits.length > 0 && (
              <div className="flex justify-end">
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-sm text-muted-foreground">Total Mensal: </span>
                  <span className="font-semibold text-lg">{formatCurrency(totalValue)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteBenefitId} onOpenChange={() => setDeleteBenefitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir benefício?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
