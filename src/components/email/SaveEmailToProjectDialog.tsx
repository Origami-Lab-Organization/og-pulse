import { useEffect, useState } from 'react';
import { FolderInput, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useEmailPlacements,
  useEmailSaveTargets,
  useSaveEmailToProject,
} from '@/hooks/useProjectEmails';
import { MAX_SUMMARY_CHARS } from '@/lib/projectEmail';
import type { MailMessageDetail } from '@/types/microsoftGraph';
import type { EmailSaveTarget } from '@/types/projectEmail';

interface SaveEmailToProjectDialogProps {
  message: MailMessageDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectPickerProps {
  targets: EmailSaveTarget[];
  savedProjectIds: Set<string>;
  value: string;
  onChange: (projectId: string) => void;
}

function ProjectPicker(props: ProjectPickerProps) {
  const { targets, savedProjectIds, value, onChange } = props;
  return (
    <div className="space-y-2">
      <Label htmlFor="save-email-project">Projeto</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="save-email-project">
          <SelectValue placeholder="Escolha o projeto" />
        </SelectTrigger>
        <SelectContent>
          {targets.map((target) => {
            const alreadySaved = savedProjectIds.has(target.id);
            return (
              <SelectItem key={target.id} value={target.id} disabled={alreadySaved}>
                {target.name}
                {alreadySaved ? ' — já salvo' : ''}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

interface AttachmentsOptionProps {
  target: EmailSaveTarget | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function AttachmentsOption(props: AttachmentsOptionProps) {
  const { target, checked, onCheckedChange } = props;
  const hasDrive = Boolean(target?.hasDriveRoot);

  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2">
        <Checkbox
          id="save-email-attachments"
          checked={hasDrive && checked}
          disabled={!hasDrive}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          className="mt-0.5"
        />
        <Label
          htmlFor="save-email-attachments"
          className="font-normal leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Copiar os anexos para a pasta do projeto no OneDrive
        </Label>
      </div>
      {target && !hasDrive && (
        <p className="pl-6 text-xs text-muted-foreground">
          Este projeto ainda não tem pasta do OneDrive vinculada. O e-mail é salvo sem os
          anexos; vincule a pasta na aba Arquivos do projeto para os próximos.
        </p>
      )}
    </div>
  );
}

/**
 * Salva uma cópia do e-mail aberto no projeto escolhido (ADR-0047). A cópia é o que
 * permite à equipe ler um e-mail que só chegou para uma pessoa.
 */
export function SaveEmailToProjectDialog(props: SaveEmailToProjectDialogProps) {
  const { message, open, onOpenChange } = props;
  const targets = useEmailSaveTargets(open);
  const placements = useEmailPlacements(open ? message.internetMessageId : null);
  const save = useSaveEmailToProject();

  const [projectId, setProjectId] = useState('');
  const [summary, setSummary] = useState('');
  const [copyAttachments, setCopyAttachments] = useState(true);

  useEffect(() => {
    if (!open) return;
    setProjectId('');
    setSummary('');
    setCopyAttachments(true);
  }, [open, message.id]);

  const savedProjectIds = new Set((placements.data ?? []).map((placement) => placement.projectId));
  const options = targets.data ?? [];
  const selected = options.find((target) => target.id === projectId);

  const handleSave = () => {
    save.mutate(
      {
        message,
        projectId,
        summary,
        copyAttachments: message.hasAttachments && Boolean(selected?.hasDriveRoot) && copyAttachments,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const renderForm = () => {
    if (targets.isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    if (targets.error) {
      return (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível carregar seus projetos. Feche e tente de novo em instantes.
          </AlertDescription>
        </Alert>
      );
    }

    if (!options.length) {
      return (
        <Alert>
          <AlertDescription>
            Você não está em nenhum projeto em andamento. Só dá para salvar e-mail em projetos
            que você gerencia ou onde está alocado.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        <ProjectPicker
          targets={options}
          savedProjectIds={savedProjectIds}
          value={projectId}
          onChange={setProjectId}
        />

        <div className="space-y-2">
          <Label htmlFor="save-email-summary">O que foi decidido (opcional)</Label>
          <Textarea
            id="save-email-summary"
            value={summary}
            onChange={(changed) => setSummary(changed.target.value)}
            maxLength={MAX_SUMMARY_CHARS}
            rows={3}
            placeholder="Ex.: cliente aprovou o escopo da fase 2 sem a integração com o ERP."
          />
          <p className="text-xs text-muted-foreground">
            Uma frase basta. Ela aparece em destaque na aba E-mails do projeto.
          </p>
        </div>

        {message.hasAttachments && (
          <AttachmentsOption
            target={selected}
            checked={copyAttachments}
            onCheckedChange={setCopyAttachments}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Salvar no projeto</DialogTitle>
          <DialogDescription>
            Uma cópia deste e-mail fica no projeto, e toda a equipe do projeto consegue ler —
            inclusive quem não recebeu a mensagem.
          </DialogDescription>
        </DialogHeader>

        {renderForm()}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!projectId || save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FolderInput className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {save.isPending ? 'Salvando…' : 'Salvar no projeto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
