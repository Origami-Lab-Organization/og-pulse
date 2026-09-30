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

// Fora do navegador (MCP em Node) a BrasilAPI recusa o User-Agent padrão com 403. No navegador
// o cabeçalho não vai: dispararia preflight de CORS, e o do browser já é aceito.
const CABECALHOS: Record<string, string> =
  typeof window === 'undefined'
    ? { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; OrigamiPulse/1.0; +https://origamipulse.com.br)' }
    : { Accept: 'application/json' };

export async function lookupCnpj(cnpj: string): Promise<ReceitaSnapshot> {
  const digitos = cnpj.replace(/\D/g, '');
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/${digitos}`, { headers: CABECALHOS });
  } catch {
    throw new CnpjLookupError('Consulta de CNPJ indisponível agora. Preencha à mão ou tente de novo.');
  }
  if (resposta.status === 404) throw new CnpjLookupError('CNPJ não encontrado na Receita.');
  if (!resposta.ok) {
    throw new CnpjLookupError('Consulta de CNPJ indisponível agora. Preencha à mão ou tente de novo.');
  }
  return receitaFromBrasilApi((await resposta.json()) as RespostaBrasilApi);
}
