import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trash2, Archive } from 'lucide-react';
import { projectService } from '@/services/projectService';

const CANCELLATION_REASONS = [
  { value: 'client_cancellation', label: 'Cancelamento pelo cliente' },
  { value: 'scope_change', label: 'Mudança de escopo' },
  { value: 'budget_constraint', label: 'Restrição orçamentária' },
  { value: 'strategic_decision', label: 'Decisão estratégica' },
  { value: 'other', label: 'Outro' },
];

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
  onArchive,
  isProcessing,
}: ProjectRemoveDialogProps) {
  const [checking, setChecking] = useState(true);
  const [hasActivity, setHasActivity] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && projectId) {
      setChecking(true);
      setReason('');
      setNotes('');
      projectService.hasActivity(projectId).then((result) => {
        setHasActivity(result);
        setChecking(false);
      }).catch(() => {
        setHasActivity(true); // Safer default
        setChecking(false);
      });
    }
  }, [open, projectId]);

  const canArchive = reason && notes.trim().length >= 10;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {checking ? 'Verificando projeto...' : hasActivity ? (
              <><Archive className="h-5 w-5 text-amber-500" /> Arquivar Projeto</>
            ) : (
              <><Trash2 className="h-5 w-5 text-destructive" /> Excluir Projeto</>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {checking ? (
                <div className="space-y-3 py-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : hasActivity ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      O projeto <strong>"{projectName}"</strong> possui lançamentos realizados e não pode ser excluído.
                      Para removê-lo do portfólio, é necessário <strong>arquivá-lo</strong> (cancelamento).
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cancel-reason">Motivo do cancelamento *</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger id="cancel-reason">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {CANCELLATION_REASONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cancel-notes">Justificativa detalhada * <span className="text-muted-foreground font-normal">(mín. 10 caracteres)</span></Label>
                      <Textarea
                        id="cancel-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descreva o motivo do cancelamento do projeto..."
                        rows={4}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <span>
                    Tem certeza que deseja excluir o projeto <strong>"{projectName}"</strong>?
                  </span>
                  <div className="text-sm space-y-1">
                    <p>Esta ação irá remover permanentemente:</p>
                    <ul className="list-disc list-inside text-muted-foreground">
                      <li>Todos os dados do projeto (time, parcelas, cronograma)</li>
                      <li>O orçamento associado (se houver)</li>
                      <li>O lead comercial associado (se houver)</li>
                    </ul>
                  </div>
                  <Badge variant="destructive" className="text-xs">Esta ação não pode ser desfeita</Badge>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {!checking && (
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            {hasActivity ? (
              <AlertDialogAction
                onClick={() => onArchive(reason, notes)}
                disabled={isProcessing || !canArchive}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {isProcessing ? 'Arquivando...' : 'Arquivar Projeto'}
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                onClick={onDelete}
                disabled={isProcessing}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isProcessing ? 'Excluindo...' : 'Excluir Projeto'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
