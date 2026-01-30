import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Truck } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BudgetSupplierInput } from '@/types/budget';

interface BudgetSuppliersEditorProps {
  suppliers: BudgetSupplierInput[];
  durationMonths: number;
  onSuppliersChange: (suppliers: BudgetSupplierInput[]) => void;
}

export function BudgetSuppliersEditor({
  suppliers,
  durationMonths,
  onSuppliersChange,
}: BudgetSuppliersEditorProps) {
  const handleAddSupplier = () => {
    const newSupplier: BudgetSupplierInput = {
      tempId: crypto.randomUUID(),
      name: '',
      description: '',
      monthlyValue: 0,
    };
    onSuppliersChange([...suppliers, newSupplier]);
  };

  const handleRemoveSupplier = (tempId: string) => {
    onSuppliersChange(suppliers.filter((s) => s.tempId !== tempId));
  };

  const handleUpdateSupplier = (
    tempId: string,
    field: 'name' | 'description' | 'monthlyValue',
    value: string | number
  ) => {
    onSuppliersChange(
      suppliers.map((s) =>
        s.tempId === tempId ? { ...s, [field]: value } : s
      )
    );
  };

  const getSupplierTotal = (supplier: BudgetSupplierInput) =>
    (supplier.monthlyValue || 0) * durationMonths;

  const totalSuppliers = suppliers.reduce((sum, s) => sum + getSupplierTotal(s), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fornecedores
            </CardTitle>
            <CardDescription>
              Adicione custos recorrentes de fornecedores externos (valor mensal × duração)
            </CardDescription>
          </div>
          <Button type="button" onClick={handleAddSupplier} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Fornecedor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum fornecedor adicionado</p>
            <p className="text-sm">Clique em "Adicionar Fornecedor" para incluir custos externos</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Nome do Fornecedor</TableHead>
                  <TableHead className="w-[30%]">Descrição</TableHead>
                  <TableHead className="text-right">Valor Mensal</TableHead>
                  <TableHead className="text-right">Total ({durationMonths} meses)</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.tempId}>
                    <TableCell>
                      <Input
                        placeholder="Nome do fornecedor..."
                        value={supplier.name}
                        onChange={(e) =>
                          handleUpdateSupplier(supplier.tempId, 'name', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Descrição do serviço..."
                        value={supplier.description}
                        onChange={(e) =>
                          handleUpdateSupplier(supplier.tempId, 'description', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                        value={supplier.monthlyValue || ''}
                        onChange={(e) =>
                          handleUpdateSupplier(
                            supplier.tempId,
                            'monthlyValue',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(getSupplierTotal(supplier))}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSupplier(supplier.tempId)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Fornecedores</p>
                <p className="text-lg font-semibold">{formatCurrency(totalSuppliers)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
