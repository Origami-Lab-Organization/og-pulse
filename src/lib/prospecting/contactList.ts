import {
  isProspectClosed,
  type ProspectContactWithCompany,
  type ProspectWithCompany,
} from '@/types/prospect';

/**
 * A lista da tela Contatos (01/10/2026, ADR-0045): cada pessoa com as oportunidades em que
 * está (desde 09/10/2026, pelos contatos de cada oportunidade).
 *
 * "No Pipeline" é estar em alguma oportunidade ainda em andamento. Quem só está em encerradas
 * (Ganho, Perda, Sem resposta) ou em nenhuma está fora — e é dali que sai a próxima abordagem.
 */

export type ContactTab = 'todos' | 'no_pipeline' | 'fora';
export type ContactSortKey = 'name' | 'company' | 'created';
export interface ContactSort {
  key: ContactSortKey;
  dir: 1 | -1;
}

export interface ContactRow {
  contact: ProspectContactWithCompany;
  /** As oportunidades da pessoa, da mais recente para a mais antiga. */
  cards: ProspectWithCompany[];
  /** A oportunidade em andamento mais recente, se houver — pode haver mais de uma. */
  aberto: ProspectWithCompany | null;
  /** A oportunidade mais recente, aberta ou encerrada: o último desfecho de quem está fora. */
  ultimo: ProspectWithCompany | null;
}

export interface ContactQuery {
  tab: ContactTab;
  busca: string;
}

const NO_PIPELINE: ContactTab = 'no_pipeline';
const FORA: ContactTab = 'fora';

/** Oportunidades agrupadas por pessoa, da mais recente para a mais antiga. */
export function cardsByContact(cards: ProspectWithCompany[]): Map<string, ProspectWithCompany[]> {
  const mapa = new Map<string, ProspectWithCompany[]>();
  for (const card of cards) {
    for (const { contact_id } of card.contacts ?? []) {
      mapa.set(contact_id, [...(mapa.get(contact_id) ?? []), card]);
    }
  }
  for (const lista of mapa.values()) lista.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return mapa;
}

/** A oportunidade em andamento mais recente da pessoa. */
export function openCardOf(cards: ProspectWithCompany[] | undefined): ProspectWithCompany | null {
  return cards?.find((c) => !isProspectClosed(c.stage)) ?? null;
}

export function buildContactRows(
  contacts: ProspectContactWithCompany[],
  cards: ProspectWithCompany[],
): ContactRow[] {
  const porContato = cardsByContact(cards);
  return contacts.map((contact) => {
    const doContato = porContato.get(contact.id) ?? [];
    return { contact, cards: doContato, aberto: openCardOf(doContato), ultimo: doContato[0] ?? null };
  });
}

function naAba(row: ContactRow, tab: ContactTab): boolean {
  if (tab === NO_PIPELINE) return !!row.aberto;
  if (tab === FORA) return !row.aberto;
  return true;
}

/** Ignora acento e caixa: quem busca "joao" espera achar "João". */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function combinaComBusca(row: ContactRow, termo: string): boolean {
  if (!termo) return true;
  const { contact } = row;
  return [contact.name, contact.email, contact.role, contact.phone, contact.linkedin_url, contact.company?.name]
    .some((campo) => !!campo && normalizar(campo).includes(termo));
}

export function applyContactQuery(rows: ContactRow[], query: ContactQuery): ContactRow[] {
  const termo = normalizar(query.busca);
  return rows.filter((row) => naAba(row, query.tab) && combinaComBusca(row, termo));
}

/** Contagem de cada aba com a busca atual — as abas dizem quanto há antes do clique. */
export function countContactTabs(rows: ContactRow[], query: ContactQuery): Record<ContactTab, number> {
  const buscados = applyContactQuery(rows, { ...query, tab: 'todos' });
  return {
    todos: buscados.length,
    no_pipeline: buscados.filter((r) => !!r.aberto).length,
    fora: buscados.filter((r) => !r.aberto).length,
  };
}

const CHAVE_DE_ORDEM: Record<ContactSortKey, (row: ContactRow) => string> = {
  name: (row) => normalizar(row.contact.name),
  company: (row) => normalizar(row.contact.company?.name ?? ''),
  created: (row) => row.contact.created_at,
};

export function sortContacts(rows: ContactRow[], sort: ContactSort): ContactRow[] {
  const chave = CHAVE_DE_ORDEM[sort.key];
  return [...rows].sort((a, b) => chave(a).localeCompare(chave(b), 'pt-BR') * sort.dir);
}
