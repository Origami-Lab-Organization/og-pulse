import type { CostCenter } from '@/types/costCenter';

/** Mesma regra do índice único do banco: sem caixa nem espaços nas pontas. */
export function normalizeCostCenterName(name: string): string {
  return name.trim().toLocaleLowerCase('pt-BR');
}

/** Centro já cadastrado com o mesmo nome (ignorando o próprio, na edição), ou `undefined`. */
export function findDuplicateCostCenter(
  existing: readonly CostCenter[],
  name: string,
  currentId?: string,
): CostCenter | undefined {
  const wanted = normalizeCostCenterName(name);
  return existing.find((c) => c.id !== currentId && normalizeCostCenterName(c.name) === wanted);
}

/** Mensagem do formulário para nome repetido: aponta o existente e, se inativo, sugere reativar. */
export function duplicateCostCenterMessage(duplicate: CostCenter): string {
  if (duplicate.is_active) return `Já existe um centro de custo chamado "${duplicate.name}".`;
  return `"${duplicate.name}" já existe e está inativo. Reative-o em vez de criar outro.`;
}
