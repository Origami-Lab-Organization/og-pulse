import { PROJECT_KIND, PROJECT_KIND_LABEL } from '@/lib/projectKind.constants';
import type { ProjectKind, ProjectKindFlags } from '@/types/projectKind';

/**
 * Tipo do projeto, derivado das duas marcas do banco (ADR-0035 e ADR-0049):
 *
 * - de cliente: faturável, sempre com cliente;
 * - interno: não faturável, cliente opcional (trabalho que o cliente não paga);
 * - produto interno: não faturável, sem cliente — o que a casa constrói para si.
 *
 * Toda tela que mostra "o cliente" de um projeto passa por `clientLabel`: produto não tem
 * cliente, e "Não definido" ali faria parecer que falta preencher algo.
 */

/** Sem as marcas (consulta antiga, linha parcial), vale o padrão do banco: projeto de cliente. */
export function projectKindOf(flags: ProjectKindFlags): ProjectKind {
  if (flags.is_internal_product) return PROJECT_KIND.PRODUCT;
  if (flags.is_billable === false) return PROJECT_KIND.INTERNAL;
  return PROJECT_KIND.CLIENT;
}

/** O nome do cliente; sem cliente, o que o projeto é. */
export function clientLabel(clientName: string | null | undefined, kind: ProjectKind): string {
  if (clientName) return clientName;
  return kind === PROJECT_KIND.CLIENT ? 'Cliente não definido' : PROJECT_KIND_LABEL[kind];
}

/** Só projeto de cliente exige cliente — o mesmo CHECK `projects_billable_needs_client`. */
export function requiresClient(kind: ProjectKind): boolean {
  return kind === PROJECT_KIND.CLIENT;
}
