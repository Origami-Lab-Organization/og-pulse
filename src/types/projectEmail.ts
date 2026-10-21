import type { MailMessageDetail } from '@/types/microsoftGraph';

/**
 * E-mail salvo no projeto como registro de decisão (ADR-0047).
 *
 * É uma CÓPIA: o `id` da mensagem no Graph vale só na caixa de quem recebeu, então
 * guardar a referência deixaria o registro ilegível para o resto da equipe.
 */

/** Anexo copiado para a pasta do projeto no OneDrive. O acesso ao arquivo é do OneDrive. */
export interface ProjectEmailAttachment {
  name: string;
  size: number;
  contentType: string;
  driveId: string;
  itemId: string;
  webUrl: string | null;
}

/** Linha da lista do projeto — sem o corpo, que pode ter megabytes de imagem embutida. */
export interface ProjectEmailListItem {
  id: string;
  projectId: string;
  subject: string;
  fromName: string | null;
  fromAddress: string | null;
  to: string[];
  cc: string[];
  receivedAt: string;
  summary: string | null;
  attachments: ProjectEmailAttachment[];
  savedById: string;
  savedByName: string | null;
  createdAt: string;
}

/** E-mail aberto: a linha da lista mais o corpo. */
export interface ProjectEmailDetail extends ProjectEmailListItem {
  body: string;
  bodyIsHtml: boolean;
}

/** Projeto onde o e-mail já foi salvo — a caixa de entrada mostra para não salvar de novo. */
export interface ProjectEmailPlacement {
  id: string;
  projectId: string;
  projectName: string;
}

/** Opção do seletor: projeto em andamento onde a pessoa pode salvar. */
export interface EmailSaveTarget {
  id: string;
  name: string;
  /** Sem pasta do OneDrive vinculada não há para onde copiar os anexos. */
  hasDriveRoot: boolean;
}

export interface CreateProjectEmailInput {
  projectId: string;
  savedById: string;
  internetMessageId: string;
  subject: string;
  fromName: string | null;
  fromAddress: string | null;
  to: string[];
  cc: string[];
  receivedAt: string;
  body: string;
  bodyIsHtml: boolean;
  summary: string | null;
  attachments: ProjectEmailAttachment[];
}

export interface SaveEmailToProjectResult {
  attachmentsCopied: number;
  /** Nomes dos anexos que não foram copiados — o e-mail é salvo mesmo assim. */
  attachmentsFailed: string[];
}

export interface SaveEmailToProjectVariables {
  message: MailMessageDetail;
  projectId: string;
  summary: string;
  copyAttachments: boolean;
}
