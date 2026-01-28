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
import { Plus, Trash2, Check, X, Heart } from 'lucide-react';
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

const BENEFIT_OPTIONS = [
  { value: 'vale_refeicao', label: 'Vale Refeição' },
  { value: 'vale_alimentacao', label: 'Vale Alimentação' },
  { value: 'vale_transporte', label: 'Vale Transporte' },
  { value: 'plano_saude', label: 'Plano de Saúde' },
  { value: 'plano_odontologico', label: 'Plano Odontológico' },
  { value: 'seguro_vida', label: 'Seguro de Vida' },
  { value: 'auxilio_creche', label: 'Auxílio Creche' },
  { value: 'auxilio_educacao', label: 'Auxílio Educação' },
  { value: 'gympass', label: 'Gympass/Wellhub' },
  { value: 'auxilio_home_office', label: 'Auxílio Home Office' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'participacao_lucros', label: 'PLR' },
  { value: 'outros', label: 'Outros' },
];

interface EmployeeBenefitsTableProps {
  employeeId: string;
  employeeName: string;
}

export function EmployeeBenefitsTable({ employeeId, employeeName }: EmployeeBenefitsTableProps) {
  const { data: benefits = [], isLoading } = useEmployeeBenefits(employeeId);
  const addBenefit = useAddEmployeeBenefit();
  const deleteBenefit = useDeleteEmployeeBenefit();

  const [isAdding, setIsAdding] = useState(false);
  const [deleteBenefitId, setDeleteBenefitId] = useState<string | null>(null);
  
  const [newBenefit, setNewBenefit] = useState({
    selectedValue: '',
    name: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const totalValue = benefits.reduce((sum, benefit) => sum + Number(benefit.monthly_value), 0);

  // Filter out benefits that are already added
  const availableBenefits = BENEFIT_OPTIONS.filter(
    opt => !benefits.some(b => b.name === opt.label)
  );

  const handleSelectBenefit = (value: string) => {
    const option = BENEFIT_OPTIONS.find(o => o.value === value);
    setNewBenefit({ 
      ...newBenefit, 
      selectedValue: value,
      name: option?.label || value 
    });
  };

  const handleAdd = () => {
    if (!newBenefit.name.trim()) return;
    
    addBenefit.mutate(
      {
        employeeId,
        name: newBenefit.name.trim(),
        monthlyValue: newBenefit.monthlyValue,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewBenefit({ selectedValue: '', name: '', monthlyValue: 0, monthlyValueDisplay: '' });
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
        {!isAdding && availableBenefits.length > 0 && (
          <Button type="button" onClick={() => setIsAdding(true)} size="sm">
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
                        <Select
                          value={newBenefit.selectedValue}
                          onValueChange={handleSelectBenefit}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione o benefício" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBenefits.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
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
                              setNewBenefit({ selectedValue: '', name: '', monthlyValue: 0, monthlyValueDisplay: '' });
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
