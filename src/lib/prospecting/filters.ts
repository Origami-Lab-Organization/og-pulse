import type { ProspectWithCompany } from '@/types/prospect';

/**
 * Filtro do Kanban de prospecção. Campo vazio não restringe nada.
 *
 * Vive fora do componente porque é regra, não desenho: a mesma combinação precisa dar o
 * mesmo resultado no board, e um dia na lista de encerrados.
 */
export interface ProspectFilter {
  empresa: string;
  contato: string;
  ownerId: string;
  lever: string;
  channel: string;
}

export const FILTRO_VAZIO: ProspectFilter = {
  empresa: '',
  contato: '',
  ownerId: '',
  lever: '',
  channel: '',
};

/** Ignora acento e caixa: quem busca "sao paulo" espera achar "São Paulo". */
function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function contem(alvo: string | null | undefined, termo: string): boolean {
  if (!termo.trim()) return true;
  return normalizar(alvo ?? '').includes(normalizar(termo));
}

function igual(alvo: string | null | undefined, escolhido: string): boolean {
  if (!escolhido) return true;
  return alvo === escolhido;
}

export function applyProspectFilter(
  prospects: ProspectWithCompany[],
  filtro: ProspectFilter,
): ProspectWithCompany[] {
  return prospects.filter(
    (p) =>
      contem(p.company?.name, filtro.empresa) &&
      contem(p.contact_name, filtro.contato) &&
      igual(p.owner_id, filtro.ownerId) &&
      igual(p.lever, filtro.lever) &&
      igual(p.primary_channel, filtro.channel),
  );
}

/** Quantos critérios estão em uso — alimenta o contador no botão. */
export function countActiveFilters(filtro: ProspectFilter): number {
  return Object.values(filtro).filter((valor) => valor.trim() !== '').length;
}
