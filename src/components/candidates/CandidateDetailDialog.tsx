import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  JobApplicationDB,
  JOB_APPLICATION_STATUS_LABELS,
  JobApplicationStatus,
  ACTIVE_STATUSES
} from "@/types/jobApplication";
import { formatDate } from "@/lib/formatters";
import {
  ExternalLink,
  FileText,
  Download,
  ArrowRight,
  ChevronDown,
  UserX,
  Star,
  Loader2,
  RotateCcw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useArchiveJobApplication,
  useManagers,
  useUpdateJobApplicationResponsavel
} from "@/hooks/useJobApplications";
import { cn } from "@/lib/utils";

interface CandidateDetailDialogProps {
  candidate: JobApplicationDB | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: JobApplicationStatus) => void;
}

const STATUS_BADGE: Record<JobApplicationStatus, string> = {
  triagem: "bg-blue-100 text-blue-700 border-blue-200",
  entrevista: "bg-yellow-100 text-yellow-700 border-yellow-200",
  prova_tecnica: "bg-orange-100 text-orange-700 border-orange-200",
  aprovado: "bg-green-100 text-green-700 border-green-200",
  descartado: "bg-red-100 text-red-700 border-red-200",
  banco_de_talentos: "bg-purple-100 text-purple-700 border-purple-200"
};

const NEXT_STATUS: Partial<Record<JobApplicationStatus, JobApplicationStatus>> =
  {
    triagem: "entrevista",
    entrevista: "prova_tecnica",
    prova_tecnica: "aprovado"
  };

const NEXT_STATUS_LABEL: Partial<Record<JobApplicationStatus, string>> = {
  entrevista: "Avançar para Entrevista",
  prova_tecnica: "Avançar para Prova Técnica",
  aprovado: "Aprovar"
};

type ArchiveAction = "descartado" | "banco_de_talentos";

const ARCHIVE_ACTION_LABELS: Record<ArchiveAction, string> = {
  descartado: "Descartar candidato",
  banco_de_talentos: "Adicionar ao Banco de Talentos"
};

export function CandidateDetailDialog({
  candidate,
  open,
  onOpenChange,
  onStatusChange
}: CandidateDetailDialogProps) {
  const { toast } = useToast();
  const archiveMutation = useArchiveJobApplication();
  const updateResponsavel = useUpdateJobApplicationResponsavel();
  const { data: managers = [] } = useManagers();

  const [archiveAction, setArchiveAction] = useState<ArchiveAction | null>(
    null
  );
  const [justificativa, setJustificativa] = useState("");

  if (!candidate) return null;

  const isActive = ACTIVE_STATUSES.includes(candidate.status);
  const nextStatus = NEXT_STATUS[candidate.status];

  const handleMoveToStatus = (status: JobApplicationStatus) => {
    onStatusChange(candidate.id, status);
    onOpenChange(false);
  };

  const handleAdvance = () => {
    if (!nextStatus) return;
    onStatusChange(candidate.id, nextStatus);
    onOpenChange(false);
  };

  const handleOpenArchive = (action: ArchiveAction) => {
    setJustificativa("");
    setArchiveAction(action);
  };

  const handleConfirmArchive = () => {
    if (!archiveAction || !justificativa.trim()) return;
    archiveMutation.mutate(
      {
        id: candidate.id,
        status: archiveAction,
        justificativa: justificativa.trim()
      },
      {
        onSuccess: () => {
          setArchiveAction(null);
          onOpenChange(false);
        }
      }
    );
  };

  const handleDownloadCurriculo = async () => {
    if (!candidate.curriculo_url) return;
    try {
      const { data, error } = await supabase.storage
        .from("curriculos")
        .createSignedUrl(candidate.curriculo_url, 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast({ title: "Erro ao abrir currículo", variant: "destructive" });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 sm:max-w-none w-[30vw] min-w-[380px]"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3 pr-6">
              <SheetTitle className="text-lg leading-tight">
                Detalhes do Candidato
              </SheetTitle>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0",
                  STATUS_BADGE[candidate.status]
                )}
              >
                {JOB_APPLICATION_STATUS_LABELS[candidate.status]}
              </span>
            </div>
            <SheetDescription>
              Candidatura recebida em {formatDate(candidate.created_at)}.
            </SheetDescription>
            {candidate.vaga_titulo && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                  Vaga: {candidate.vaga_titulo}
                </span>
              </div>
            )}
          </SheetHeader>

          {isActive && (
            <div className="px-6 py-4 border-b border-border shrink-0">
              <Select
                onValueChange={(val) =>
                  handleMoveToStatus(val as JobApplicationStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mover para etapa..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_STATUSES.filter((s) => s !== candidate.status).map(
                    (s) => (
                      <SelectItem key={s} value={s}>
                        {JOB_APPLICATION_STATUS_LABELS[s]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Responsável */}
          <div className="px-6 py-3 border-b border-border shrink-0 space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Responsável
            </Label>
            <Select
              value={candidate.responsavel_id ?? "none"}
              onValueChange={(val) =>
                updateResponsavel.mutate({
                  id: candidate.id,
                  responsavelId: val === "none" ? null : val
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isActive && candidate.justificativa_movimentacao && (
            <div className="px-6 py-4 border-b border-border shrink-0 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {candidate.status === "descartado"
                  ? "Motivo do descarte"
                  : "Motivo da inclusão no Banco de Talentos"}
              </p>
              <blockquote className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground italic leading-relaxed">
                "{candidate.justificativa_movimentacao}"
              </blockquote>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nome Completo
                  </Label>
                  <Input
                    value={candidate.nome}
                    readOnly
                    disabled
                    className="bg-muted/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      E-mail
                    </Label>
                    <Input
                      value={candidate.email}
                      readOnly
                      disabled
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Telefone
                    </Label>
                    <Input
                      value={candidate.telefone}
                      readOnly
                      disabled
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                {candidate.linkedin && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      LinkedIn
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={candidate.linkedin}
                        readOnly
                        disabled
                        className="bg-muted/30 flex-1"
                      />
                      <a
                        href={candidate.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 p-2 rounded-md border border-input bg-background hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Candidatura
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Por que você quer trabalhar na Origami?
                  </Label>
                  <blockquote className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-foreground italic leading-relaxed">
                    "{candidate.motivacao}"
                  </blockquote>
                </div>
              </div>

              {candidate.curriculo_nome && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Currículo
                    </p>
                    <button
                      onClick={handleDownloadCurriculo}
                      className="w-full flex items-center gap-3 rounded-md border border-border bg-muted/30 hover:bg-muted/60 px-4 py-3 transition-colors text-left group"
                    >
                      <FileText className="h-5 w-5 text-destructive shrink-0" />
                      <span className="flex-1 text-sm text-foreground truncate">
                        {candidate.curriculo_nome}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground uppercase tracking-wide flex items-center gap-1">
                        <Download className="h-3.5 w-3.5" />
                        Acessar
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="px-6 py-4 border-t border-border shrink-0 flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {!isActive && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  onStatusChange(candidate.id, "triagem");
                  onOpenChange(false);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reativar candidato
              </Button>
            )}
            {isActive && (
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-1">
                      Ações
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleOpenArchive("banco_de_talentos")}
                      className="gap-2"
                    >
                      <Star className="h-4 w-4 text-purple-500" />
                      Banco de Talentos
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleOpenArchive("descartado")}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <UserX className="h-4 w-4" />
                      Descartar candidato
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {nextStatus && (
                  <Button onClick={handleAdvance} className="gap-2">
                    {NEXT_STATUS_LABEL[nextStatus]}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={!!archiveAction}
        onOpenChange={(open) => {
          if (!open) setArchiveAction(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {archiveAction ? ARCHIVE_ACTION_LABELS[archiveAction] : ""}
            </DialogTitle>
            <DialogDescription>
              Informe o motivo para registrar o histórico desta movimentação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="justificativa">Justificativa</Label>
            <Textarea
              id="justificativa"
              placeholder="Ex: Perfil não se encaixa no momento, mas tem potencial para vagas futuras..."
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveAction(null)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmArchive}
              disabled={!justificativa.trim() || archiveMutation.isPending}
              variant={
                archiveAction === "descartado" ? "destructive" : "default"
              }
            >
              {archiveMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
