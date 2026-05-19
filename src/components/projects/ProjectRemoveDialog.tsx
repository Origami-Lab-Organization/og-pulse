import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { projectService } from '@/services/projectService';

interface ProjectRemoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onDelete: () => void;
  onArchive: (reason: string, notes: string) => void;
  isProcessing?: boolean;
}

export function ProjectRemoveDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onDelete,
  isProcessing,
}: ProjectRemoveDialogProps) {
  const [checking, setChecking] = useState(true);
  const [hasActivity, setHasActivity] = useState(false);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (open && projectId) {
      setChecking(true);
      setJustification('');
      projectService.hasActivity(projectId).then((result) => {
        setHasActivity(result);
        setChecking(false);
      }).catch(() => {
        setHasActivity(true);
        setChecking(false);
      });
    }
  }, [open, projectId]);

  const canDelete = !hasActivity || justification.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Excluir Projeto Permanentemente
          </DialogTitle>
        </DialogHeader>

        {checking ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div className="text-sm text-destructive space-y-1">
                <p>
                  Você está prestes a excluir permanentemente o projeto{' '}
                  <strong>"{projectName}"</strong>.
                </p>
                <p>
                  Todos os dados associados serão perdidos, incluindo: time alocado,
                  parcelas, timesheets, orçamento, fornecedores, materiais, comissões
                  e o lead comercial vinculado.
                </p>
              </div>
            </div>

            <Badge variant="destructive" className="text-xs">
              Esta ação é irreversível e não pode ser desfeita
            </Badge>

            {hasActivity && (
              <div className="space-y-1.5">
                <Label htmlFor="delete-justification">
                  Justificativa para exclusão *{' '}
                  <span className="text-muted-foreground font-normal">(mín. 10 caracteres)</span>
                </Label>
                <Textarea
                  id="delete-justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Descreva o motivo da exclusão deste projeto..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {justification.trim().length}/10 caracteres mínimos
                </p>
              </div>
            )}
          </div>
        )}

        {!checking && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isProcessing || !canDelete}
            >
              {isProcessing ? 'Excluindo...' : 'Excluir Definitivamente'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
