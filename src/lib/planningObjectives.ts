import type { KeyResultDraft, KeyResultInput } from '@/types/projectPlanning';

/**
 * Cadastro do objetivo com os resultados-chave (US-0039, cenário 4): cada resultado-chave diz
 * como será medido, de onde parte, aonde quer chegar e até quando.
 */

export const emptyKeyResult = (): KeyResultDraft => ({
  description: '',
  measurement: '',
  baseline: '',
  target: '',
  unit: '',
  targetDate: '',
});

/** "1.234,5", "2,5" ou "2.5" → número; vazio ou inválido → `null`. */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed;
  const value = Number(normalized.replace(/[^\d.-]/g, ''));
  return Number.isFinite(value) ? value : null;
}

const REQUIRED_TEXT: { field: keyof KeyResultDraft; message: string }[] = [
  { field: 'description', message: 'Descreva o resultado-chave.' },
  { field: 'measurement', message: 'Diga como medir: o indicador e de onde vem o número.' },
  { field: 'unit', message: 'Informe a unidade (%, dias, clientes…).' },
  { field: 'targetDate', message: 'Informe o prazo: até quando a meta deve ser atingida.' },
];

function numbersProblem(draft: KeyResultDraft): string | null {
  if (parseDecimal(draft.baseline) === null) return 'Informe a linha de base: o valor de hoje.';
  if (parseDecimal(draft.target) === null) return 'Informe a meta: aonde quer chegar.';
  return null;
}

/**
 * O que falta no resultado-chave, ou `null` quando está completo. O prazo é obrigatório e aberto:
 * o resultado pode ser medido depois do fim do projeto (decisão do Victor, 24/11/2026).
 */
export function keyResultProblem(draft: KeyResultDraft): string | null {
  const missing = REQUIRED_TEXT.find((rule) => !draft[rule.field].trim());
  if (missing) return missing.message;
  return numbersProblem(draft);
}

/** Prazo já passado: a tela avisa, sem impedir. */
export const isPastDate = (date: string, today: string) => Boolean(date) && date < today;

export function toKeyResultInput(draft: KeyResultDraft): KeyResultInput {
  return {
    description: draft.description.trim(),
    measurement: draft.measurement.trim(),
    baseline: parseDecimal(draft.baseline) ?? 0,
    target: parseDecimal(draft.target) ?? 0,
    unit: draft.unit.trim(),
    targetDate: draft.targetDate,
  };
}
