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
import { formatCurrency } from '@/lib/formatters';
import { formatCurrency as formatCurrencyMask, parseCurrency } from '@/lib/masks';
import { Plus, Trash2, Check, X, Heart } from 'lucide-react';

export interface LocalBenefit {
  id: string;
  name: string;
  description?: string;
  monthlyValue: number;
}

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

interface EmployeeBenefitsLocalTableProps {
  benefits: LocalBenefit[];
  onChange: (benefits: LocalBenefit[]) => void;
  employeeName?: string;
}

export function EmployeeBenefitsLocalTable({ 
  benefits, 
  onChange, 
  employeeName = 'Funcionário' 
}: EmployeeBenefitsLocalTableProps) {
  const [isAdding, setIsAdding] = useState(false);
  
  const [newBenefit, setNewBenefit] = useState({
    selectedValue: '',
    name: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const totalValue = benefits.reduce((sum, benefit) => sum + benefit.monthlyValue, 0);

  // Filter out benefits that are already added
  const availableBenefits = BENEFIT_OPTIONS.filter(
    opt => !benefits.some(b => b.name === opt.label)
  );

  const handleAdd = () => {
    if (!newBenefit.name.trim()) return;
    
    const newItem: LocalBenefit = {
      id: `temp-${Date.now()}`,
      name: newBenefit.name.trim(),
      monthlyValue: newBenefit.monthlyValue,
    };
    
    onChange([...benefits, newItem]);
    setIsAdding(false);
    setNewBenefit({ selectedValue: '', name: '', monthlyValue: 0, monthlyValueDisplay: '' });
  };

  const handleDelete = (id: string) => {
    onChange(benefits.filter(b => b.id !== id));
  };

  const handleSelectBenefit = (value: string) => {
    const option = BENEFIT_OPTIONS.find(o => o.value === value);
    setNewBenefit({ 
      ...newBenefit, 
      selectedValue: value,
      name: option?.label || value 
    });
  };

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
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {benefits.length === 0 && !isAdding ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum benefício cadastrado. Clique em "Adicionar" para incluir.
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
                            size="icon"
                            variant="ghost"
                            onClick={handleAdd}
                            disabled={!newBenefit.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
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
                        {formatCurrency(benefit.monthlyValue)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(benefit.id)}
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
    </Card>
  );
}
