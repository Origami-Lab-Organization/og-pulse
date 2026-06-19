import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, UserCheck } from "lucide-react";
import { JobApplicationDB } from "@/types/jobApplication";
import { useHireCandidate } from "@/hooks/useJobApplications";

interface CandidateHireDialogProps {
  candidate: JobApplicationDB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CandidateHireDialog({
  candidate,
  open,
  onOpenChange,
  onSuccess,
}: CandidateHireDialogProps) {
  const hireMutation = useHireCandidate();

  if (!candidate) return null;

  const handleConfirm = () => {
    hireMutation.mutate(candidate, {
      onSuccess: () => {
        onSuccess?.();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!hireMutation.isPending) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Confirmar Contratação
          </DialogTitle>
          <DialogDescription>
            O candidato será convertido em funcionário com os dados da
            candidatura. O perfil pode ser complementado pelo DP na tela de
            Funcionários.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Nome: </span>
            <span className="font-medium">{candidate.nome}</span>
          </p>
          <p>
            <span className="text-muted-foreground">E-mail: </span>
            <span className="font-medium">{candidate.email}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Telefone: </span>
            <span className="font-medium">{candidate.telefone}</span>
          </p>
          {candidate.vaga_titulo && (
            <p>
              <span className="text-muted-foreground">Vaga: </span>
              <span className="font-medium">{candidate.vaga_titulo}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={hireMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={hireMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {hireMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Confirmar Contratação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
