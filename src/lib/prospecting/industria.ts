import type { IndustrySignal, ReceitaCnae, ReceitaDetails } from '@/types/receita';

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
const DIVISOES: Record<string, string> = {
  '05': 'Carvão mineral',
  '06': 'Petróleo e gás',
  '07': 'Mineração (metálicos)',
  '08': 'Mineração (não metálicos)',
  '09': 'Apoio à extração mineral',
  '10': 'Alimentos',
  '11': 'Bebidas',
  '12': 'Fumo',
  '13': 'Têxtil',
  '14': 'Vestuário',
  '15': 'Couro e calçados',
  '16': 'Madeira',
  '17': 'Papel e celulose',
  '18': 'Gráfica',
  '19': 'Derivados de petróleo e biocombustíveis',
  '20': 'Química',
  '21': 'Farmacêutica',
  '22': 'Borracha e plástico',
  '23': 'Minerais não metálicos',
  '24': 'Metalurgia',
  '25': 'Produtos de metal',
  '26': 'Eletrônicos e informática',
  '27': 'Máquinas e materiais elétricos',
  '28': 'Máquinas e equipamentos',
  '29': 'Automotiva',
  '30': 'Outros equipamentos de transporte',
  '31': 'Móveis',
  '32': 'Produtos diversos',
  '33': 'Manutenção e instalação de máquinas',
};

const EXTRATIVA = new Set(['05', '06', '07', '08', '09']);
const FONTE_SECUNDARIA: IndustrySignal['fonte'] = 'secundaria';

/** A divisão (2 dígitos) do CNAE; a BrasilAPI manda número e perde o zero à esquerda. */
export function divisaoDoCnae(codigo: string): string {
  return codigo.replace(/\D/g, '').padStart(7, '0').slice(0, 2);
}

function sinalDe(cnae: ReceitaCnae, fonte: IndustrySignal['fonte']): IndustrySignal | null {
  const divisao = divisaoDoCnae(cnae.codigo);
  const ramo = DIVISOES[divisao];
  if (!ramo) return null;
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
