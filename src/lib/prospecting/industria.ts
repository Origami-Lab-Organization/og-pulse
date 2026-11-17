import type { IndustrySignal, ReceitaCnae, ReceitaDetails } from '@/types/receita';
import { divisaoDoCnae, RAMOS, ramosDosSetores } from './cnae';

/**
 * Indústria pelo CNAE (29/09/2026) — o mercado-alvo da Origami.
 *
 * A CNAE 2.0 do IBGE diz o ramo pelos dois primeiros dígitos (a divisão): seção B, divisões
 * 05–09, é a indústria extrativa; seção C, divisões 10–33, a de transformação. Olha o CNAE
 * principal primeiro e, se ele não for industrial, os secundários — há fábrica registrada com
 * a atividade comercial como principal, e ela é tão cliente quanto as outras.
 *
 * Módulo puro: o MCP da Prospecção importa o mesmo arquivo.
 */

// Os nomes dos ramos vêm da CNAE inteira (cnae.ts); aqui só interessam os da indústria.
const INDUSTRIAIS = new Set(ramosDosSetores(['B', 'C']));

const EXTRATIVA = new Set(['05', '06', '07', '08', '09']);
const FONTE_SECUNDARIA: IndustrySignal['fonte'] = 'secundaria';

function sinalDe(cnae: ReceitaCnae, fonte: IndustrySignal['fonte']): IndustrySignal | null {
  const divisao = divisaoDoCnae(cnae.codigo);
  if (!INDUSTRIAIS.has(divisao)) return null;
  const ramo = RAMOS[divisao];
  return { industrial: true, ramo, tipo: EXTRATIVA.has(divisao) ? 'extrativa' : 'transformacao', fonte };
}

const NAO_INDUSTRIAL: IndustrySignal = { industrial: false, ramo: null, tipo: null, fonte: null };

export function industrySignal(detalhes: Pick<ReceitaDetails, 'cnaePrincipal' | 'cnaesSecundarios'> | null | undefined): IndustrySignal {
  if (!detalhes) return NAO_INDUSTRIAL;
  const principal = detalhes.cnaePrincipal ? sinalDe(detalhes.cnaePrincipal, 'principal') : null;
  if (principal) return principal;
  for (const cnae of detalhes.cnaesSecundarios ?? []) {
    const secundario = sinalDe(cnae, 'secundaria');
    if (secundario) return secundario;
  }
  return NAO_INDUSTRIAL;
}

export function industryLabel(sinal: IndustrySignal): string | null {
  if (!sinal.industrial) return null;
  const secundaria = sinal.fonte === FONTE_SECUNDARIA ? ' (atividade secundária)' : '';
  return `Indústria · ${sinal.ramo}${secundaria}`;
}
