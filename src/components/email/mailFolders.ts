import { WELL_KNOWN_FOLDER } from '@/types/microsoftGraph';
import type { MailFolder } from '@/types/microsoftGraph';

/**
 * Chave da pasta na navegação: o alias para as pastas padrão (`inbox`,
 * `sentitems`…), o id para as criadas pela pessoa. Assim a Caixa de Entrada
 * aberta por padrão e a clicada na lista são a mesma consulta.
 */
export function folderKey(folder: MailFolder): string {
  return folder.wellKnown ?? folder.id;
}

/** Nessas pastas a linha mostra "Para:", porque quem enviou sou eu. */
export function showsRecipients(key: string): boolean {
  return key === WELL_KNOWN_FOLDER.SENT || key === WELL_KNOWN_FOLDER.DRAFTS;
}
