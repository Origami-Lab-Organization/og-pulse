import { useState } from 'react';
import { Plus, Trash2, Package, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
import { ProjectMaterialDB, CreateProjectMaterialInput } from '@/types/project';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAddProjectMaterial, useRemoveProjectMaterial, useUpdateProjectMaterial } from '@/hooks/useProjectCosts';

interface ProjectMaterialsSectionProps {
  projectId: string;
  materials: ProjectMaterialDB[];
  isEditable: boolean;
}

export function ProjectMaterialsSection({ projectId, materials, isEditable }: ProjectMaterialsSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<CreateProjectMaterialInput, 'projectId'>>({
    description: '',
    value: 0,
    purchaseDate: undefined,
    isRealized: false,
  });

  const addMaterial = useAddProjectMaterial();
  const removeMaterial = useRemoveProjectMaterial();
  const updateMaterial = useUpdateProjectMaterial();

  const handleSubmit = () => {
    addMaterial.mutate(
      { projectId, ...formData },
      {
        onSuccess: () => {
          setDialogOpen(false);
          setFormData({ description: '', value: 0, purchaseDate: undefined, isRealized: false });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    removeMaterial.mutate({ id, projectId });
  };

  const handleToggleRealized = (id: string, isRealized: boolean) => {
    updateMaterial.mutate({ id, projectId, updates: { isRealized: !isRealized } });
  };

  const totalValue = materials.reduce((sum, m) => sum + Number(m.value), 0);
  const realizedValue = materials.filter((m) => m.is_realized).reduce((sum, m) => sum + Number(m.value), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Materiais
            </CardTitle>
            <CardDescription>
              Custos avulsos com materiais e insumos
            </CardDescription>
          </div>
          {isEditable && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Material
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {materials.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead className="text-center">Realizado</TableHead>
                    {isEditable && <TableHead className="w-16" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(material.value)}</TableCell>
                      <TableCell>
                        {material.purchase_date 
                          ? format(parseISO(material.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleRealized(material.id, material.is_realized)}
                          disabled={updateMaterial.isPending}
                          className="h-8 w-8 p-0"
                        >
                          {material.is_realized ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                              <Check className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Não</Badge>
                          )}
                        </Button>
                      </TableCell>
                      {isEditable && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(material.id)}
                            disabled={removeMaterial.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {formatCurrency(realizedValue)} realizado
                    </TableCell>
                    {isEditable && <TableCell />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground italic text-center py-8">
              Nenhum material cadastrado.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Material</DialogTitle>
            <DialogDescription>
              Adicione um custo avulso com materiais ou insumos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o material ou insumo"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Data Prevista de Compra</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate || ''}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRealized"
                checked={formData.isRealized}
                onCheckedChange={(checked) => setFormData({ ...formData, isRealized: checked === true })}
              />
              <Label htmlFor="isRealized" className="text-sm">
                Já foi realizado/comprado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.description || addMaterial.isPending}>
              {addMaterial.isPending ? 'Salvando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
