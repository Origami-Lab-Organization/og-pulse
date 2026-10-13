import { receitaFromBrasilApi, receitaFromCnpja } from '@/lib/prospecting/receita';
import type { ReceitaSnapshot, RespostaBrasilApi, RespostaCnpja } from '@/types/receita';

/**
 * Consulta pública de CNPJ (29/09/2026) — BrasilAPI, que espelha a base aberta da Receita.
 *
 * Contrato em `.harness/integrations/brasilapi-cnpj.md`. Sem chave e sem backend: é dado
 * público de empresa, não de pessoa, e sai do navegador de quem está cadastrando. Só o
 * CNPJ digitado vai para fora; nada do Pulse acompanha. A tradução da resposta mora em
 * `src/lib/prospecting/receita.ts`, a mesma que o MCP usa.
 */
const BASE = 'https://brasilapi.com.br/api/cnpj/v1';
const RESERVA = 'https://open.cnpja.com/office';
const INDISPONIVEL = 'Consulta de CNPJ indisponível agora. Preencha à mão ou tente de novo.';
const NAO_ENCONTRADO = 'CNPJ não encontrado na Receita.';

export class CnpjLookupError extends Error {}
/** A reserva limita as consultas por minuto: a importação em lote espera e tenta de novo. */
export class CnpjLookupLimitError extends CnpjLookupError {}

// Fora do navegador (MCP em Node) a BrasilAPI recusa o User-Agent padrão com 403. No navegador
// o cabeçalho não vai: dispararia preflight de CORS, e o do browser já é aceito.
const CABECALHOS: Record<string, string> =
  typeof window === 'undefined'
    ? { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; OrigamiPulse/1.0; +https://origamipulse.com.br)' }
    : { Accept: 'application/json' };

async function buscar(url: string): Promise<Response | null> {
  try {
    return await fetch(url, { headers: CABECALHOS });
  } catch {
    return null;
  }
}

export async function lookupCnpj(cnpj: string): Promise<ReceitaSnapshot> {
  const digitos = cnpj.replace(/\D/g, '');
  const resposta = await buscar(`${BASE}/${digitos}`);
  if (resposta?.status === 404) throw new CnpjLookupError(NAO_ENCONTRADO);
  if (resposta?.ok) return receitaFromBrasilApi((await resposta.json()) as RespostaBrasilApi);
  return consultarReserva(digitos);
}

/**
 * A BrasilAPI lê do Minha Receita, que em 13/10/2026 devolvia 503 para 10 de 12 CNPJs da
 * Prospecção. A CNPJá aberta tem o mesmo cadastro, menos o regime tributário, e limita as
 * consultas por minuto.
 */
async function consultarReserva(digitos: string): Promise<ReceitaSnapshot> {
  const resposta = await buscar(`${RESERVA}/${digitos}`);
  if (resposta?.status === 404) throw new CnpjLookupError(NAO_ENCONTRADO);
  if (resposta?.status === 429) {
    throw new CnpjLookupLimitError('Muitas consultas de CNPJ seguidas. Tente de novo em 1 minuto.');
  }
  if (!resposta?.ok) throw new CnpjLookupError(INDISPONIVEL);
  return receitaFromCnpja((await resposta.json()) as RespostaCnpja);
}
