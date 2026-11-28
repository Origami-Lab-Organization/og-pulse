/** "Cliente antes do Pulse" (US-0051): o Pulse começou em 2026; o banco aceita de 1950 a 2026. */
export const ANO_DO_PULSE = 2026;
export const PRIMEIRO_ANO_DE_CLIENTE = 1950;

/** Do mais recente ao mais antigo, para a lista do modal. */
export const ANOS_ANTES_DO_PULSE: readonly number[] = Array.from(
  { length: ANO_DO_PULSE - PRIMEIRO_ANO_DE_CLIENTE + 1 },
  (_, i) => ANO_DO_PULSE - i,
);
