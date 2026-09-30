import { receitaFromBrasilApi } from '@/lib/prospecting/receita';
import type { ReceitaSnapshot, RespostaBrasilApi } from '@/types/receita';

/**
 * Consulta pública de CNPJ (29/09/2026) — BrasilAPI, que espelha a base aberta da Receita.
 *
 * Contrato em `.harness/integrations/brasilapi-cnpj.md`. Sem chave e sem backend: é dado
 * público de empresa, não de pessoa, e sai do navegador de quem está cadastrando. Só o
 * CNPJ digitado vai para fora; nada do Pulse acompanha. A tradução da resposta mora em
 * `src/lib/prospecting/receita.ts`, a mesma que o MCP usa.
 */
const BASE = 'https://brasilapi.com.br/api/cnpj/v1';

export class CnpjLookupError extends Error {}

export async function lookupCnpj(cnpj: string): Promise<ReceitaSnapshot> {
  const digitos = cnpj.replace(/\D/g, '');
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/${digitos}`, { headers: { Accept: 'application/json' } });
  } catch {
    throw new CnpjLookupError('Consulta de CNPJ indisponível agora. Preencha à mão ou tente de novo.');
  }
  if (resposta.status === 404) throw new CnpjLookupError('CNPJ não encontrado na Receita.');
  if (!resposta.ok) {
    throw new CnpjLookupError('Consulta de CNPJ indisponível agora. Preencha à mão ou tente de novo.');
  }
  return receitaFromBrasilApi((await resposta.json()) as RespostaBrasilApi);
}
