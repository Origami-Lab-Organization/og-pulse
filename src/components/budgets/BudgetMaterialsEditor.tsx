import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { BudgetMaterialInput } from '@/types/budget';

interface BudgetMaterialsEditorProps {
  materials: BudgetMaterialInput[];
  onMaterialsChange: (materials: BudgetMaterialInput[]) => void;
}

export function BudgetMaterialsEditor({
  materials,
  onMaterialsChange,
}: BudgetMaterialsEditorProps) {
  const handleAddMaterial = () => {
    const newMaterial: BudgetMaterialInput = {
      tempId: crypto.randomUUID(),
      description: '',
      value: 0,
    };
    onMaterialsChange([...materials, newMaterial]);
  };

  const handleRemoveMaterial = (tempId: string) => {
    onMaterialsChange(materials.filter((m) => m.tempId !== tempId));
  };

  const handleUpdateMaterial = (
    tempId: string,
    field: 'description' | 'value',
    value: string | number
  ) => {
    onMaterialsChange(
      materials.map((m) =>
        m.tempId === tempId ? { ...m, [field]: value } : m
      )
    );
  };

  const totalMaterials = materials.reduce((sum, m) => sum + (m.value || 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiais
            </CardTitle>
            <CardDescription>
              Adicione custos de materiais ou outros itens ao orçamento
            </CardDescription>
          </div>
          <Button onClick={handleAddMaterial} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Material
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum material adicionado</p>
            <p className="text-sm">Clique em "Adicionar Material" para incluir custos extras</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => (
                  <TableRow key={material.tempId}>
                    <TableCell>
                      <Input
                        placeholder="Descrição do material..."
                        value={material.description}
                        onChange={(e) =>
                          handleUpdateMaterial(material.tempId, 'description', e.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                        value={material.value || ''}
                        onChange={(e) =>
                          handleUpdateMaterial(
                            material.tempId,
                            'value',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMaterial(material.tempId)}
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
                <p className="text-sm text-muted-foreground">Total Materiais</p>
                <p className="text-lg font-semibold">{formatCurrency(totalMaterials)}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
