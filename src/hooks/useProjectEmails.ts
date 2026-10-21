import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  acquireGraphToken,
  acquireGraphTokenForScopes,
} from '@/integrations/microsoft/msalClient';
import {
  FILES_SCOPES,
  base64ToBlob,
  ensureDriveFolder,
  fetchAttachmentContent,
  listMessageAttachments,
  uploadDriveFile,
} from '@/services/microsoftGraphService';
import { projectDriveService } from '@/services/projectDriveService';
import { projectEmailService } from '@/services/projectEmailService';
import {
  PROJECT_EMAILS_FOLDER,
  attachmentFolderName,
  bodyForStorage,
  normalizeSummary,
  saveEmailErrorMessage,
} from '@/lib/projectEmail';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import type { MailMessageDetail } from '@/types/microsoftGraph';
import type {
  ProjectEmailAttachment,
  SaveEmailToProjectResult,
  SaveEmailToProjectVariables,
} from '@/types/projectEmail';

const PROJECT_EMAILS_KEY = 'project-emails';
const PROJECT_EMAIL_KEY = 'project-email';
const PLACEMENTS_KEY = 'project-email-placements';

/** E-mails salvos no projeto, do mais recente para o mais antigo. */
export function useProjectEmails(projectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [PROJECT_EMAILS_KEY, projectId],
    enabled: Boolean(projectId) && enabled,
    queryFn: () => projectEmailService.listByProject(projectId as string),
  });
}

/** E-mail aberto, com o corpo. */
export function useProjectEmailDetail(id: string | null) {
  return useQuery({
    queryKey: [PROJECT_EMAIL_KEY, id],
    enabled: Boolean(id),
    queryFn: () => projectEmailService.getById(id as string),
  });
}

/** Projetos onde este e-mail já está salvo. */
export function useEmailPlacements(internetMessageId: string | null | undefined) {
  return useQuery({
    queryKey: [PLACEMENTS_KEY, internetMessageId],
    enabled: Boolean(internetMessageId),
    queryFn: () => projectEmailService.listPlacements(internetMessageId as string),
  });
}

/** Projetos em andamento onde a pessoa pode salvar. */
export function useEmailSaveTargets(enabled: boolean) {
  return useQuery({
    queryKey: ['project-email-save-targets'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => projectEmailService.listSaveTargets(),
  });
}

interface CopyResult {
  copied: ProjectEmailAttachment[];
  failed: string[];
}

/**
 * Copia os anexos do e-mail para "E-mails/<data> <assunto>" na pasta do projeto.
 *
 * Um anexo de cada vez: o conteúdo passa pela memória do navegador, e anexo grande em
 * paralelo pesa. Falha em um anexo não derruba os outros nem o e-mail — a decisão
 * registrada vale mais que o arquivo, e quem salvou fica sabendo o que faltou.
 */
async function copyAttachmentsToProjectDrive(
  message: MailMessageDetail,
  projectId: string,
): Promise<CopyResult> {
  const drive = await projectDriveService.get(projectId);
  if (!drive) return { copied: [], failed: [] };

  const mailToken = await acquireGraphToken();
  const attachments = await listMessageAttachments(mailToken, message.id);
  if (!attachments.length) return { copied: [], failed: [] };

  const filesToken = await acquireGraphTokenForScopes(FILES_SCOPES);
  const emailsFolder = await ensureDriveFolder(
    filesToken,
    drive.driveId,
    drive.rootItemId,
    PROJECT_EMAILS_FOLDER,
  );
  const target = await ensureDriveFolder(
    filesToken,
    emailsFolder.driveId,
    emailsFolder.id,
    attachmentFolderName(message.receivedAt, message.subject),
  );

  const result: CopyResult = { copied: [], failed: [] };
  for (const attachment of attachments) {
    try {
      const content = await fetchAttachmentContent(mailToken, message.id, attachment.id);
      const blob = base64ToBlob(content.contentBytes, content.contentType);
      const uploaded = await uploadDriveFile(filesToken, target.driveId, target.id, blob, content.name);
      result.copied.push({
        name: uploaded.name,
        size: uploaded.size || attachment.size,
        contentType: content.contentType,
        driveId: uploaded.driveId,
        itemId: uploaded.id,
        webUrl: uploaded.webUrl,
      });
    } catch (error) {
      console.error('[project-email] anexo não copiado:', error instanceof Error ? error.message : error);
      result.failed.push(attachment.name);
    }
  }
  return result;
}

/** Erro de pasta ou de token vira "nenhum anexo copiado", nunca "e-mail não salvo". */
async function copyAttachmentsSafely(
  message: MailMessageDetail,
  projectId: string,
): Promise<CopyResult> {
  try {
    return await copyAttachmentsToProjectDrive(message, projectId);
  } catch (error) {
    console.error('[project-email] pasta de anexos indisponível:', error instanceof Error ? error.message : error);
    return { copied: [], failed: ['todos os anexos'] };
  }
}

export function useSaveEmailToProject() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (variables: SaveEmailToProjectVariables): Promise<SaveEmailToProjectResult> => {
      const { message, projectId, summary, copyAttachments } = variables;
      if (!employee?.id) throw new Error('Sessão sem funcionário identificado.');
      if (!message.internetMessageId) {
        throw new Error('A Microsoft não informou a identificação deste e-mail. Tente abrir de novo.');
      }

      // Antes dos anexos: e-mail repetido não pode deixar arquivo órfão no OneDrive.
      const placements = await projectEmailService.listPlacements(message.internetMessageId);
      if (placements.some((placement) => placement.projectId === projectId)) {
        throw new Error('Este e-mail já está salvo neste projeto.');
      }

      const attachments = copyAttachments
        ? await copyAttachmentsSafely(message, projectId)
        : { copied: [], failed: [] };

      await projectEmailService.create({
        projectId,
        savedById: employee.id,
        internetMessageId: message.internetMessageId,
        subject: message.subject,
        fromName: message.from,
        fromAddress: message.fromAddress,
        to: message.to,
        cc: message.cc,
        receivedAt: message.receivedAt,
        body: bodyForStorage(message.body),
        bodyIsHtml: message.bodyIsHtml,
        summary: normalizeSummary(summary),
        attachments: attachments.copied,
      });

      return {
        attachmentsCopied: attachments.copied.length,
        attachmentsFailed: attachments.failed,
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_EMAILS_KEY, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [PLACEMENTS_KEY] });

      if (result.attachmentsFailed.length) {
        toast.warning('E-mail salvo no projeto, mas nem todos os anexos foram copiados.', {
          description: `Não copiados: ${result.attachmentsFailed.join(', ')}. Envie pela aba Arquivos do projeto.`,
        });
        return;
      }
      toast.success(
        result.attachmentsCopied
          ? `E-mail salvo no projeto, com ${result.attachmentsCopied} anexo(s) no OneDrive.`
          : 'E-mail salvo no projeto.',
      );
    },
    onError: (error) => {
      toast.error(saveEmailErrorMessage(error));
    },
  });
}

export function useUpdateProjectEmailSummary(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; summary: string }) =>
      projectEmailService.updateSummary(variables.id, normalizeSummary(variables.summary)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_EMAILS_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [PROJECT_EMAIL_KEY, variables.id] });
      toast.success('Resumo atualizado.');
    },
    onError: (error) => {
      toast.error(mensagemParaUsuario(error));
    },
  });
}

export function useDeleteProjectEmail(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectEmailService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_EMAILS_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [PLACEMENTS_KEY] });
      toast.success('E-mail removido do projeto. Os anexos continuam na pasta do OneDrive.');
    },
    onError: (error) => {
      toast.error(mensagemParaUsuario(error, 'Não foi possível remover o e-mail. Tente de novo em instantes.'));
    },
  });
}
