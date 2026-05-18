import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ProjectMaterialDB } from '@/types/project';
import { getProjectMonthLabel } from '@/lib/formatters';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useUpdateProjectMaterial } from '@/hooks/useProjectCosts';

interface MaterialRealizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: ProjectMaterialDB[];
  projectId: string;
  projectStartDate: string;
}

export function MaterialRealizeDialog({
  open,
  onOpenChange,
  materials,
  projectId,
  projectStartDate,
}: MaterialRealizeDialogProps) {
  const formatCurrency = useMaskedCurrency();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const updateMaterial = useUpdateProjectMaterial();

  // Filter materials that are not realized
  const unrealizedMaterials = materials.filter((m) => !m.is_realized);

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
    }
  }, [open]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === unrealizedMaterials.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unrealizedMaterials.map((m) => m.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    
    try {
      // Update each selected material in sequence to avoid race conditions
      for (const id of selectedIds) {
        await updateMaterial.mutateAsync({
          id,
          projectId,
          updates: { isRealized: true },
        });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const totalSelected = Array.from(selectedIds).reduce((sum, id) => {
    const material = materials.find((m) => m.id === id);
    return sum + (material ? Number(material.value) : 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="h-5 w-5" />
            Registrar Materiais Realizados
          </DialogTitle>
          <DialogDescription>
            Selecione os materiais que já foram pagos ou realizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {unrealizedMaterials.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedIds.size === unrealizedMaterials.length
                    ? 'Desmarcar todos'
                    : 'Selecionar todos'}
                </Button>
                {selectedIds.size > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selecionado(s) - {formatCurrency(totalSelected)}
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {unrealizedMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleToggle(material.id)}
                  >
                    <Checkbox
                      id={material.id}
                      checked={selectedIds.has(material.id)}
                      onCheckedChange={() => handleToggle(material.id)}
                    />
                    <Label
                      htmlFor={material.id}
                      className="flex-1 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{material.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {getProjectMonthLabel(material.month_number || 1, projectStartDate)}
                        </p>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(material.value)}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Todos os materiais já foram realizados.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isSaving}
          >
            {isSaving ? 'Salvando...' : `Confirmar (${selectedIds.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
