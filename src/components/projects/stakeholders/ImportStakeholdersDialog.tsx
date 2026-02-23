import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useClientStakeholders } from '@/hooks/useClientStakeholders';
import { useCreateStakeholder } from '@/hooks/useProjectStakeholders';
import {
  ProjectStakeholder,
  STAKEHOLDER_ACTION_OPTIONS,
  STAKEHOLDER_ROLES,
  StakeholderAction,
} from '@/types/projectStakeholder';
import { useToast } from '@/hooks/use-toast';

interface ImportStakeholdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId: string;
  currentStakeholders: ProjectStakeholder[];
}

export function ImportStakeholdersDialog({
  open,
  onOpenChange,
  projectId,
  clientId,
  currentStakeholders,
}: ImportStakeholdersDialogProps) {
  const { data: available = [], isLoading } = useClientStakeholders(clientId, projectId, currentStakeholders);
  const createStakeholder = useCreateStakeholder();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Record<string, StakeholderAction | null>>({});
  const [importing, setImporting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (id in copy) {
        delete copy[id];
      } else {
        copy[id] = null;
      }
      return copy;
    });
  };

  const setAction = (id: string, action: StakeholderAction) => {
    setSelected((prev) => ({ ...prev, [id]: action }));
  };

  const selectedIds = Object.keys(selected);
  const allHaveAction = selectedIds.length > 0 && selectedIds.every((id) => selected[id] !== null);

  const handleImport = async () => {
    if (!allHaveAction) return;
    setImporting(true);
    try {
      for (const id of selectedIds) {
        const stakeholder = available.find((s) => s.id === id);
        if (!stakeholder) continue;
        await createStakeholder.mutateAsync({
          projectId,
          name: stakeholder.name,
          jobTitle: stakeholder.job_title || undefined,
          role: stakeholder.role,
          organization: stakeholder.organization || undefined,
          email: stakeholder.email || undefined,
          phone: stakeholder.phone || undefined,
          influenceLevel: stakeholder.influence_level || undefined,
          interestLevel: stakeholder.interest_level || undefined,
          sponsorshipLevel: stakeholder.sponsorship_level || undefined,
          action: selected[id]!,
          notes: stakeholder.notes || undefined,
        });
      }
      toast({
        title: 'Stakeholders importados',
        description: `${selectedIds.length} stakeholder(s) importado(s) com sucesso.`,
      });
      setSelected({});
      onOpenChange(false);
    } catch {
      // error toast is handled by the mutation
    } finally {
      setImporting(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const found = STAKEHOLDER_ROLES.find((r) => r.value === role);
    return found?.label || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Stakeholders do Cliente</DialogTitle>
          <DialogDescription>
            Selecione stakeholders de outros projetos do mesmo cliente e defina a ação para cada um.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
        ) : available.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhum stakeholder disponível para importação.
          </p>
        ) : (
          <div className="space-y-3">
            {available.map((s) => {
              const isSelected = s.id in selected;
              return (
                <div
                  key={s.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(s.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(s.role)}
                      </Badge>
                      {s.organization && (
                        <Badge variant="secondary" className="text-xs">
                          {s.organization === 'client' ? 'Cliente' : s.organization === 'partner' ? 'Parceiro' : 'Outro'}
                        </Badge>
                      )}
                    </div>
                    {s.job_title && (
                      <p className="text-xs text-muted-foreground">{s.job_title}</p>
                    )}
                    {s.email && (
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    )}
                    {isSelected && (
                      <div className="pt-1">
                        <Select
                          value={selected[s.id] || ''}
                          onValueChange={(val) => setAction(s.id, val as StakeholderAction)}
                        >
                          <SelectTrigger className="h-8 text-xs w-56">
                            <SelectValue placeholder="Selecione a ação..." />
                          </SelectTrigger>
                          <SelectContent>
                            {STAKEHOLDER_ACTION_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!allHaveAction || importing}
          >
            <Download className="mr-2 h-4 w-4" />
            {importing ? 'Importando...' : `Importar (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
