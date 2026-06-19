import { useState } from 'react';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmployeeBenefit } from '@/types/employee';
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import {
  useEmployeeBenefits,
  useAddEmployeeBenefit,
  useDeleteEmployeeBenefit,
} from '@/hooks/useEmployees';
import { Plus, Trash2, Check, X, Heart, CalendarIcon } from 'lucide-react';
import { useBenefits } from '@/hooks/useBenefits';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


interface EmployeeBenefitsTableProps {
  employeeId: string;
  employeeName: string;
}

type PendingAction = 
  | { type: 'add'; name: string; monthlyValue: number }
  | { type: 'delete'; benefitId: string };

export function EmployeeBenefitsTable({ employeeId, employeeName }: EmployeeBenefitsTableProps) {
  const { data: benefits = [], isLoading } = useEmployeeBenefits(employeeId);
  const { data: catalog = [] } = useBenefits();
  const addBenefit = useAddEmployeeBenefit();
  const deleteBenefit = useDeleteEmployeeBenefit();

  const [isAdding, setIsAdding] = useState(false);
  const [deleteBenefitId, setDeleteBenefitId] = useState<string | null>(null);
  const [effectiveDateDialogOpen, setEffectiveDateDialogOpen] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(new Date());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [newBenefit, setNewBenefit] = useState({
    catalogId: '',
    name: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const totalValue = benefits.reduce((sum, benefit) => sum + Number(benefit.monthly_value), 0);

  const activeCatalog = catalog.filter((b) => b.isActive);
  const availableBenefits = activeCatalog.filter(
    (opt) => !benefits.some((b) => b.name === opt.name)
  );

  const handleSelectBenefit = (catalogId: string) => {
    const item = activeCatalog.find((b) => b.id === catalogId);
    if (!item) return;
    setNewBenefit({
      catalogId,
      name: item.name,
      monthlyValue: item.value,
      monthlyValueDisplay: formatCurrencyMask(item.value),
    });
  };

  const handleAdd = () => {
    if (!newBenefit.name.trim()) return;
    
    // Open effective date dialog
    setPendingAction({ type: 'add', name: newBenefit.name.trim(), monthlyValue: newBenefit.monthlyValue });
    setEffectiveDate(new Date());
    setEffectiveDateDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deleteBenefitId) return;
    
    // Open effective date dialog
    setPendingAction({ type: 'delete', benefitId: deleteBenefitId });
    setDeleteBenefitId(null);
    setEffectiveDate(new Date());
    setEffectiveDateDialogOpen(true);
  };

  const handleEffectiveDateConfirm = () => {
    if (!pendingAction || !effectiveDate) return;
    
    const effectiveFromStr = format(effectiveDate, 'yyyy-MM-dd');

    if (pendingAction.type === 'add') {
      addBenefit.mutate(
        {
          employeeId,
          name: pendingAction.name,
          monthlyValue: pendingAction.monthlyValue,
          effectiveFrom: effectiveFromStr,
          recalculate: true,
        },
        {
          onSuccess: () => {
            setIsAdding(false);
            setNewBenefit({ catalogId: '', name: '', monthlyValue: 0, monthlyValueDisplay: '' });
            setEffectiveDateDialogOpen(false);
            setPendingAction(null);
          },
        }
      );
    } else if (pendingAction.type === 'delete') {
      deleteBenefit.mutate(
        { id: pendingAction.benefitId, employeeId, effectiveFrom: effectiveFromStr, recalculate: true },
        {
          onSuccess: () => {
            setEffectiveDateDialogOpen(false);
            setPendingAction(null);
          },
        }
      );
    }
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
        {!isAdding && availableBenefits.length > 0 && (
          <Button type="button" onClick={() => setIsAdding(true)} size="sm" disabled={catalog.length === 0}>
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
                    <TableHead className="text-right">Valor Mensal</TableHead>
                    <TableHead className="w-[80px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdding && (
                    <TableRow>
                      <TableCell>
                        <Select value={newBenefit.catalogId} onValueChange={handleSelectBenefit}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione do catálogo" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBenefits.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={handleAdd}
                            disabled={addBenefit.isPending || !newBenefit.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              setNewBenefit({ catalogId: '', name: '', monthlyValue: 0, monthlyValueDisplay: '' });
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
                        <span className="font-medium">{benefit.name}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(benefit.monthly_value))}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteBenefitId(benefit.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteBenefitId} onOpenChange={() => setDeleteBenefitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir benefício?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O custo do funcionário será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Effective date dialog */}
      <Dialog open={effectiveDateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEffectiveDateDialogOpen(false);
          setPendingAction(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data de Vigência</DialogTitle>
            <DialogDescription>
              Selecione a data a partir da qual esta alteração de benefício entra em vigor. 
              Isso criará um novo marco financeiro para o funcionário.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="mb-2 block">Data de vigência</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !effectiveDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {effectiveDate ? format(effectiveDate, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={effectiveDate}
                  onSelect={setEffectiveDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEffectiveDateDialogOpen(false);
              setPendingAction(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEffectiveDateConfirm}
              disabled={!effectiveDate || addBenefit.isPending || deleteBenefit.isPending}
            >
              {addBenefit.isPending || deleteBenefit.isPending ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
