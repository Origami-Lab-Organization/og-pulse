import { useState } from 'react';
import { Cloud, Link2Off, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MicrosoftLogo } from '@/components/auth/MicrosoftLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useMicrosoftConnection } from '@/hooks/useMicrosoftGraph';
import { useLinkProjectDrive, useProjectDriveLink, useUnlinkProjectDrive } from '@/hooks/useProjectDrive';
import { OneDriveRootPicker } from '@/components/projects/detail/OneDriveRootPicker';

interface ProjectDriveLinkCardProps {
  projectId: string;
  /** Só GP e admin escolhem a raiz do projeto. */
  canManage?: boolean;
}

export function ProjectDriveLinkCard({ projectId, canManage = false }: ProjectDriveLinkCardProps) {
  const { employee } = useAuth();
  const { data: link } = useProjectDriveLink(projectId);
  const { isConfigured, isConnected, isLoading, connect, isConnecting } = useMicrosoftConnection();
  const isDisconnected = isConfigured && !isConnected && !isLoading;
  const linkDrive = useLinkProjectDrive(projectId);
  const unlinkDrive = useUnlinkProjectDrive(projectId);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConfirmingUnlink, setIsConfirmingUnlink] = useState(false);

  if (!canManage && !link) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <Cloud className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {link ? 'Pasta do OneDrive' : 'Nenhuma pasta do OneDrive vinculada'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {isDisconnected && !link ? (
              'Conecte sua conta Microsoft para escolher a pasta do projeto no OneDrive.'
            ) : link ? (
              <>
                {link.rootPath}
                {link.linkedAt && (
                  <> · vinculada em {format(parseISO(link.linkedAt), 'dd/MM/yyyy', { locale: ptBR })}</>
                )}
              </>
            ) : (
              'Escolha a pasta raiz do projeto. Nada é movido — o Pulse só guarda para onde apontar.'
            )}
          </p>
        </div>
        {canManage && isDisconnected ? (
          <Button variant="outline" size="sm" className="shrink-0" onClick={connect} disabled={isConnecting}>
            {isConnecting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MicrosoftLogo className="mr-2 h-4 w-4" />
            )}
            {isConnecting ? 'Aguardando...' : 'Conectar Microsoft'}
          </Button>
        ) : canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setIsPickerOpen(true)}>
              {link ? 'Trocar pasta' : 'Escolher pasta'}
            </Button>
            {link && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => setIsConfirmingUnlink(true)}
                aria-label="Remover vínculo com o OneDrive"
              >
                <Link2Off className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>

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

      <AlertDialog open={isConfirmingUnlink} onOpenChange={setIsConfirmingUnlink}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o vínculo com o OneDrive?</AlertDialogTitle>
            <AlertDialogDescription>
              Nenhum arquivo é apagado — nem aqui, nem no OneDrive. O projeto apenas deixa de apontar para
              essa pasta, e você pode escolher outra depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                unlinkDrive.mutate();
                setIsConfirmingUnlink(false);
              }}
            >
              Remover vínculo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
