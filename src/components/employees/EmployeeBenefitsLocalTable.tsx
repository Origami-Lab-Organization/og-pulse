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
import { Plus, Trash2, Check, X, Heart, RefreshCw, ExternalLink } from 'lucide-react';
import { useBenefits } from '@/hooks/useBenefits';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface LocalBenefit {
  id: string;
  name: string;
  description?: string;
  monthlyValue: number;
}

interface EmployeeBenefitsLocalTableProps {
  benefits: LocalBenefit[];
  onChange: (benefits: LocalBenefit[]) => void;
  employeeName?: string;
}

export function EmployeeBenefitsLocalTable({
  benefits,
  onChange,
  employeeName = 'Funcionário',
}: EmployeeBenefitsLocalTableProps) {
  const { data: catalog = [], refetch: refetchCatalog } = useBenefits();
  const activeCatalog = catalog.filter((b) => b.isActive);

  const [isAdding, setIsAdding] = useState(false);
  const [emptyCatalogDialogOpen, setEmptyCatalogDialogOpen] = useState(false);

  const handleOpenAdd = () => {
    if (availableOptions.length === 0) {
      setEmptyCatalogDialogOpen(true);
    } else {
      setIsAdding(true);
    }
  };

  const [newBenefit, setNewBenefit] = useState({
    catalogId: '',
    name: '',
    description: '',
    monthlyValue: 0,
    monthlyValueDisplay: '',
  });

  const totalValue = benefits.reduce((sum, b) => sum + b.monthlyValue, 0);

  const availableOptions = activeCatalog.filter(
    (opt) => !benefits.some((b) => b.name === opt.name)
  );

  const handleSelectCatalog = (catalogId: string) => {
    const item = activeCatalog.find((b) => b.id === catalogId);
    if (!item) return;
    setNewBenefit({
      catalogId,
      name: item.name,
      description: item.description || '',
      monthlyValue: item.value,
      monthlyValueDisplay: formatCurrencyMask(item.value),
    });
  };

  const handleAdd = () => {
    if (!newBenefit.name.trim()) return;
    onChange([
      ...benefits,
      {
        id: `temp-${Date.now()}`,
        name: newBenefit.name.trim(),
        description: newBenefit.description || undefined,
        monthlyValue: newBenefit.monthlyValue,
      },
    ]);
    setIsAdding(false);
    setNewBenefit({ catalogId: '', name: '', description: '', monthlyValue: 0, monthlyValueDisplay: '' });
  };

  const handleDelete = (id: string) => onChange(benefits.filter((b) => b.id !== id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Benefícios
          </CardTitle>
          <CardDescription>Benefícios mensais de {employeeName}</CardDescription>
        </div>
        {!isAdding && (
          <Button type="button" onClick={handleOpenAdd} size="sm">
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
                        <div className="flex items-center gap-2">
                          <Select value={newBenefit.catalogId} onValueChange={handleSelectCatalog}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione do catálogo" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => refetchCatalog()}
                            title="Atualizar catálogo"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
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
                            disabled={!newBenefit.name.trim()}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              setNewBenefit({ catalogId: '', name: '', description: '', monthlyValue: 0, monthlyValueDisplay: '' });
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
                          type="button"
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

      {/* Empty catalog dialog */}
      <Dialog open={emptyCatalogDialogOpen} onOpenChange={setEmptyCatalogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nenhum benefício disponível</DialogTitle>
            <DialogDescription>
              Todos os benefícios do catálogo já foram adicionados a este funcionário, ou o catálogo ainda não possui itens cadastrados.
              Acesse a página de Ferramentas e Benefícios para criar novos itens.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmptyCatalogDialogOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                window.open('/rh/ferramentas-beneficios', '_blank');
                setEmptyCatalogDialogOpen(false);
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ir para Ferramentas e Benefícios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
