import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface AdminEditEntry {
  id: string;
  projectId: string;
  projectMemberId: string;
  employeeName: string;
  projectName: string;
  workDate: string;
  currentHours: number;
}

interface AdminEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AdminEditEntry | null;
  onSave: (newHours: number, justification: string) => void;
  isSaving: boolean;
}

export function AdminEditDialog({
  open,
  onOpenChange,
  entry,
  onSave,
  isSaving,
}: AdminEditDialogProps) {
  const [newHours, setNewHours] = useState<string>('');
  const [justification, setJustification] = useState('');

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewHours('');
      setJustification('');
    } else if (entry) {
      setNewHours(entry.currentHours.toString());
    }
    onOpenChange(isOpen);
  };

  const handleSave = () => {
    const hours = parseFloat(newHours);
    if (isNaN(hours) || hours < 0 || hours > 24) return;
    if (justification.length < 10) return;
    
    onSave(hours, justification);
    handleOpenChange(false);
  };

  if (!entry) return null;

  const formattedDate = format(parseISO(entry.workDate), "EEEE, dd/MM/yyyy", { locale: ptBR });
  const isValid = 
    newHours !== '' && 
    !isNaN(parseFloat(newHours)) && 
    parseFloat(newHours) >= 0 && 
    parseFloat(newHours) <= 24 &&
    justification.length >= 10;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Editar Timesheet Enviado
          </DialogTitle>
          <DialogDescription>
            Este timesheet já foi enviado e está travado. Para alterar, é necessário fornecer uma justificativa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Funcionário:</span>
              <span className="font-medium">{entry.employeeName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Projeto:</span>
              <span className="font-medium">{entry.projectName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium capitalize">{formattedDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Horas atuais:</span>
              <span className="font-medium">{entry.currentHours}h</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newHours">Novas horas *</Label>
            <Input
              id="newHours"
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={newHours}
              onChange={(e) => setNewHours(e.target.value)}
              placeholder="Ex: 6"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">
              Justificativa * <span className="text-xs text-muted-foreground">(mínimo 10 caracteres)</span>
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Descreva o motivo da alteração..."
              rows={3}
            />
            {justification.length > 0 && justification.length < 10 && (
              <p className="text-xs text-destructive">
                A justificativa deve ter no mínimo 10 caracteres ({justification.length}/10)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alteração'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
