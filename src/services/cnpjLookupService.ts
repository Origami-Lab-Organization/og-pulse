import type { CnpjLookupResult } from '@/types/cnpjLookup';

/**
 * Consulta pública de CNPJ (29/09/2026) — BrasilAPI, que espelha a base aberta da Receita.
 *
 * Contrato em `.harness/integrations/brasilapi-cnpj.md`. Sem chave e sem backend: é dado
 * público de empresa, não de pessoa, e sai do navegador de quem está cadastrando. Só o
 * CNPJ digitado vai para fora; nada do Pulse acompanha.
 */
const BASE = 'https://brasilapi.com.br/api/cnpj/v1';

export class CnpjLookupError extends Error {}

interface RespostaBrasilApi {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnae_fiscal_descricao?: string | null;
  municipio?: string | null;
  uf?: string | null;
}

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
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
  return paraCadastro((await resposta.json()) as RespostaBrasilApi);
}

function paraCadastro(dado: RespostaBrasilApi): CnpjLookupResult {
  const semVazio = (valor?: string | null) => (valor && valor.trim() ? valor.trim() : null);
  return {
    cnpj: dado.cnpj.replace(/\D/g, ''),
    razaoSocial: dado.razao_social.trim(),
    nomeFantasia: semVazio(dado.nome_fantasia),
    segmento: semVazio(dado.cnae_fiscal_descricao),
    cidade: semVazio(dado.municipio),
    uf: semVazio(dado.uf),
  };
}
