import { useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { acquireGraphTokenForScopes } from '@/integrations/microsoft/msalClient';
import {
  FILES_SCOPES,
  GraphError,
  collectDriveFolderTree,
  createDriveFolder,
  createDriveShareLink,
  deleteDriveItem,
  getDriveDownloadUrl,
  getDriveItemOrNull,
  inviteToDriveItem,
  listDriveChildren,
  listDriveItemPermissions,
  moveDriveItem,
  removeDriveItemPermission,
  renameDriveItem,
  uploadDriveFile,
} from '@/services/microsoftGraphService';
import {
  indexDriveFolders,
  indexDriveTree,
  listIndexedDriveFolders,
} from '@/services/projectFolderService';
import { GRAPH_ERROR_CODE } from '@/types/microsoftGraph';
import type { DriveEntry } from '@/types/microsoftGraph';

/**
 * Token do Graph com escopo de arquivos, guardado em ref para não refazer o
 * popup a cada navegação. A MSAL já renova em silêncio quando expira.
 */
function useFilesToken() {
  const tokenRef = useRef<string | null>(null);

  return useCallback(async () => {
    if (!tokenRef.current) {
      tokenRef.current = await acquireGraphTokenForScopes(FILES_SCOPES);
    }
    return tokenRef.current;
  }, []);
}

export const useDriveChildren = (driveId: string, itemId: string | null) => {
  const getToken = useFilesToken();

  return useQuery({
    queryKey: ['drive-children', driveId, itemId],
    queryFn: async () => listDriveChildren(await getToken(), driveId, itemId as string),
    enabled: Boolean(driveId !== undefined && itemId),
    staleTime: 30_000,
  });
};

interface RootEntriesInput {
  projectId: string;
  tenantId?: string;
  driveId: string;
  rootItemId: string;
  /** GP/admin alimentam o índice; os demais só o consomem. */
  canIndex: boolean;
}

/**
 * Conteúdo da raiz do projeto, resolvido de dois jeitos porque as pessoas têm
 * acessos diferentes:
 *
 * - Quem alcança a raiz (GP) lista direto e, de quebra, registra as subpastas no
 *   índice local.
 * - Quem NÃO alcança (analista com acesso só a uma subpasta) toma 403 ao listar
 *   o pai — no OneDrive, acesso a subpasta não dá acesso a ela. Aí o índice
 *   entra: sabendo os ids, o Pulse pergunta uma a uma e o próprio OneDrive diz
 *   quais ele pode abrir. Nenhuma decisão de acesso é tomada aqui.
 */
export const useDriveRootEntries = ({
  projectId,
  tenantId,
  driveId,
  rootItemId,
  canIndex,
}: RootEntriesInput) => {
  const getToken = useFilesToken();

  return useQuery({
    queryKey: ['drive-root-entries', projectId, driveId, rootItemId],
    queryFn: async () => {
      const token = await getToken();

      try {
        const entries = await listDriveChildren(token, driveId, rootItemId);
        if (canIndex && tenantId) {
          await indexDriveFolders(
            projectId,
            tenantId,
            entries.filter((e) => e.isFolder).map((e) => ({ externalId: e.id, name: e.name })),
          );
        }
        return { entries, isPartial: false };
      } catch (error) {
        const denied =
          error instanceof GraphError &&
          (error.code === GRAPH_ERROR_CODE.FORBIDDEN || error.code === GRAPH_ERROR_CODE.NOT_FOUND);
        if (!denied) throw error;

        const indexed = await listIndexedDriveFolders(projectId);
        const probed = await Promise.all(
          indexed.map((folder) => getDriveItemOrNull(token, driveId, folder.externalId)),
        );

        return { entries: probed.filter((entry): entry is DriveEntry => entry !== null), isPartial: true };
      }
    },
    enabled: Boolean(driveId !== undefined && rootItemId && projectId),
    staleTime: 30_000,
  });
};

interface DriveMutationContext {
  driveId: string;
  itemId: string;
}

export const useCreateDriveFolder = ({ driveId, itemId }: DriveMutationContext) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => createDriveFolder(await getToken(), driveId, itemId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-children', driveId, itemId] });
      toast({ title: 'Pasta criada no OneDrive.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar pasta',
        description: error.message.includes('409')
          ? 'Já existe uma pasta com esse nome aqui.'
          : 'Verifique sua permissão de escrita nessa pasta do OneDrive.',
        variant: 'destructive',
      });
    },
  });
};

export const useUploadDriveFile = ({ driveId, itemId }: DriveMutationContext) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ file, fileName }: { file: File; fileName: string }) =>
      uploadDriveFile(await getToken(), driveId, itemId, file, fileName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-children', driveId, itemId] });
      toast({ title: 'Arquivo enviado ao OneDrive.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao enviar arquivo',
        description: 'Verifique sua permissão de escrita nessa pasta do OneDrive.',
        variant: 'destructive',
      });
    },
  });
};

/** Varre a árvore no OneDrive e alimenta o índice que sustenta a visão parcial. */
export const useSyncProjectDriveTree = (projectId: string, tenantId?: string) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ driveId, rootItemId }: { driveId: string; rootItemId: string }) => {
      if (!tenantId) throw new Error('Tenant não identificado');
      const token = await getToken();
      const nodes = await collectDriveFolderTree(token, driveId, rootItemId);
      return indexDriveTree(projectId, tenantId, nodes);
    },
    onSuccess: (inserted) => {
      queryClient.invalidateQueries({ queryKey: ['drive-root-entries', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-folders', projectId] });
      toast({
        title: 'Sincronizado com o OneDrive',
        description:
          inserted > 0
            ? `${inserted} pasta(s) nova(s) no índice — a equipe passa a enxergar o que tem acesso.`
            : 'Nenhuma pasta nova encontrada.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao sincronizar',
        description: 'Verifique se você ainda tem acesso à pasta raiz no OneDrive.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteDriveItem = ({ driveId, itemId }: DriveMutationContext) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetId: string) => deleteDriveItem(await getToken(), driveId, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-children', driveId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['drive-root-entries'] });
      toast({ title: 'Item excluído no OneDrive.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir',
        description: 'Verifique sua permissão nessa pasta do OneDrive.',
        variant: 'destructive',
      });
    },
  });
};

export const useRenameDriveItem = ({ driveId, itemId }: DriveMutationContext) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ targetId, name }: { targetId: string; name: string }) =>
      renameDriveItem(await getToken(), driveId, targetId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-children', driveId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['drive-root-entries'] });
      toast({ title: 'Item renomeado no OneDrive.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao renomear',
        description: 'Já pode existir um item com esse nome, ou você não tem permissão.',
        variant: 'destructive',
      });
    },
  });
};

export const useMoveDriveItem = ({ driveId, itemId }: DriveMutationContext) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ targetId, folderId }: { targetId: string; folderId: string }) =>
      moveDriveItem(await getToken(), driveId, targetId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-children'] });
      queryClient.invalidateQueries({ queryKey: ['drive-root-entries'] });
      toast({ title: 'Item movido no OneDrive.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao mover',
        description: 'Verifique sua permissão na pasta de destino.',
        variant: 'destructive',
      });
    },
  });
};

/** Ações que só leem: abrem em aba nova ou copiam, sem invalidar cache. */
export const useDriveItemActions = (driveId: string) => {
  const getToken = useFilesToken();
  const { toast } = useToast();

  const download = async (itemId: string) => {
    try {
      const url = await getDriveDownloadUrl(await getToken(), driveId, itemId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast({ title: 'Não foi possível baixar', variant: 'destructive' });
    }
  };

  const copyLink = async (itemId: string) => {
    try {
      const url = await createDriveShareLink(await getToken(), driveId, itemId);
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copiado',
        description: 'Vale para quem é da organização. Ninguém de fora abre.',
      });
    } catch {
      toast({
        title: 'Não foi possível gerar o link',
        description: 'Verifique sua permissão de compartilhamento nessa pasta.',
        variant: 'destructive',
      });
    }
  };

  return { download, copyLink };
};

export const useDriveItemPermissions = (driveId: string, itemId: string | null) => {
  const getToken = useFilesToken();

  return useQuery({
    queryKey: ['drive-permissions', driveId, itemId],
    queryFn: async () => listDriveItemPermissions(await getToken(), driveId, itemId as string),
    enabled: Boolean(driveId !== undefined && itemId),
  });
};

interface InviteInput {
  emails: string[];
  role: 'read' | 'write';
  message?: string;
}

export const useInviteToDriveItem = (driveId: string, itemId: string | null) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ emails, role, message }: InviteInput) =>
      inviteToDriveItem(await getToken(), driveId, itemId as string, emails, role, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['drive-permissions', driveId, itemId] });
      toast({
        title: 'Acesso concedido',
        description: `${variables.emails.length} pessoa(s) receberam o convite por e-mail.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao conceder acesso',
        description: 'Você precisa ser dono da pasta no OneDrive para compartilhá-la.',
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveDrivePermission = (driveId: string, itemId: string | null) => {
  const queryClient = useQueryClient();
  const getToken = useFilesToken();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (permissionId: string) =>
      removeDriveItemPermission(await getToken(), driveId, itemId as string, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drive-permissions', driveId, itemId] });
      toast({ title: 'Acesso removido.' });
    },
    onError: () => {
      toast({
        title: 'Erro ao remover acesso',
        description: 'Acesso herdado da pasta acima só pode ser removido lá.',
        variant: 'destructive',
      });
    },
  });
};
