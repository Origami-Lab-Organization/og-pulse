import { useRef, useState } from 'react';
import { Check, Cloud, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { useMicrosoftConnection } from '@/hooks/useMicrosoftGraph';
import { useLinkProjectDrive, useProjectDriveLink } from '@/hooks/useProjectDrive';
import { useUploadDriveFile } from '@/hooks/useDriveBrowser';
import { OneDriveRootPicker } from '@/components/projects/detail/OneDriveRootPicker';

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

interface CloseDealContractUploadProps {
  projectId: string;
  onDone: () => void;
}

/**
 * Anexo do contrato no fechamento do negócio. Vai direto para o OneDrive — não
 * existe mais cópia no bucket. Como o projeto acabou de nascer, normalmente a
 * pasta ainda não está vinculada, então o vínculo acontece aqui mesmo.
 */
export function CloseDealContractUpload({ projectId, onDone }: CloseDealContractUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { employee } = useAuth();
  const { toast } = useToast();

  const { data: link } = useProjectDriveLink(projectId);
  const {
    isConfigured,
    isConnected,
    isLoading: isLoadingAccount,
    connect,
    isConnecting,
  } = useMicrosoftConnection();
  const linkDrive = useLinkProjectDrive(projectId);
  const upload = useUploadDriveFile({
    driveId: link?.driveId ?? '',
    itemId: link?.rootItemId ?? '',
  });

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Sem conta autorizada não há como escolher pasta nem enviar; pular continua
  // disponível para não travar o fechamento do negócio por causa disso.
  if (isConfigured && !isConnected && !isLoadingAccount) {
    return (
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={connect} disabled={isConnecting}>
          {isConnecting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <MicrosoftLogo className="mr-2 h-4 w-4" />
          )}
          {isConnecting ? 'Aguardando autorização...' : 'Conectar Microsoft'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={onDone}>
          Pular por enquanto
        </Button>
      </div>
    );
  }

  const handleFile = (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast({
        title: 'Contrato não enviado',
        description: 'O limite é 100MB.',
        variant: 'destructive',
      });
      return;
    }
    upload.mutate({ file, fileName: file.name }, { onSuccess: onDone });
  };

  if (!link) {
    return (
      <>
        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => setIsPickerOpen(true)}>
            <Cloud className="mr-2 h-4 w-4" />
            Escolher a pasta do projeto no OneDrive
          </Button>
          <Button variant="ghost" className="w-full" onClick={onDone}>
            Pular por enquanto
          </Button>
        </div>

        <OneDriveRootPicker
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          isSaving={linkDrive.isPending}
          onConfirm={(folder) =>
            linkDrive.mutate(
              {
                projectId,
                driveId: folder.driveId,
                rootItemId: folder.id,
                rootPath: folder.path,
                linkedBy: employee?.id,
              },
              { onSuccess: () => setIsPickerOpen(false) },
            )
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-primary-deep" aria-hidden />
        Pasta vinculada: <span className="truncate font-medium">{link.rootPath}</span>
      </p>

      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = '';
        }}
      />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => inputRef.current?.click()}
        disabled={upload.isPending}
      >
        {upload.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {upload.isPending ? 'Enviando...' : 'Enviar contrato para o OneDrive'}
      </Button>
      <Button variant="ghost" className="w-full" onClick={onDone} disabled={upload.isPending}>
        Pular por enquanto
      </Button>
    </div>
  );
}
