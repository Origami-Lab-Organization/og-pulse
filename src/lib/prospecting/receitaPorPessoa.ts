import TABELA from './receitaPorPessoa.json';
import type { ReceitaPorPessoa } from '@/types/filtrosReceita';

/**
 * Receita por pessoa ocupada para a estimativa de faturamento (US-0006), a mais específica
 * que o IBGE publica para a empresa:
 *
 * - indústria: classe da CNAE (PIA, empresas com 30+ pessoas) × fator da faixa de porte;
 * - comércio: classe (PAC, 20+ pessoas) × fator da faixa de porte da divisão;
 * - construção: grupo × faixa de porte (PAIC, 5+ pessoas);
 * - serviços: divisão (PAS) × fator de menos de 20 ou 20+ pessoas;
 * - ramos sem pesquisa anual: divisão pelas Contas Nacionais 2021 × 1,62, sem porte.
 *
 * A tabela por classe e porte vem de receitaPorPessoa.json, montado por
 * scripts/receita/montar-receita-por-pessoa.ts. Aprovada pelo Victor em 17/11/2026.
 */

type Fonte = 'PIA' | 'PAIC' | 'PAC' | 'PAS' | 'SCN';

const FONTES: Record<Fonte, string> = {
  PIA: 'IBGE, PIA-Empresa 2024',
  PAIC: 'IBGE, PAIC 2024',
  PAC: 'IBGE, PAC 2024',
  PAS: 'IBGE, PAS 2024',
  SCN: 'IBGE, Contas Nacionais 2021 × 1,62',
};

/** Mil reais por pessoa por divisão da CNAE (todas as 87 da base): o valor quando não há classe nem porte. */
export const RECEITA_POR_PESSOA: Record<string, readonly [number, Fonte]> = {
  // PIA
  '05': [625, 'PIA'], '06': [17885, 'PIA'], '07': [2157, 'PIA'], '08': [436, 'PIA'], '09': [926, 'PIA'], '10': [756, 'PIA'],
  '11': [927, 'PIA'], '12': [1580, 'PIA'], '13': [311, 'PIA'], '14': [181, 'PIA'], '15': [175, 'PIA'], '16': [334, 'PIA'],
  '17': [931, 'PIA'], '18': [257, 'PIA'], '19': [4121, 'PIA'], '20': [1674, 'PIA'], '21': [910, 'PIA'], '22': [491, 'PIA'],
  '23': [431, 'PIA'], '24': [1695, 'PIA'], '25': [370, 'PIA'], '26': [1271, 'PIA'], '27': [704, 'PIA'], '28': [705, 'PIA'],
  '29': [1232, 'PIA'], '30': [902, 'PIA'], '31': [222, 'PIA'], '32': [294, 'PIA'], '33': [234, 'PIA'],
  // PAIC
  '41': [273, 'PAIC'], '42': [271, 'PAIC'], '43': [171, 'PAIC'],
  // PAC
  '45': [800, 'PAC'], '46': [1863, 'PAC'], '47': [417, 'PAC'],
  // PAS
  '37': [177, 'PAS'], '38': [177, 'PAS'], '39': [177, 'PAS'], '49': [314, 'PAS'], '50': [1097, 'PAS'], '51': [1253, 'PAS'],
  '52': [406, 'PAS'], '53': [207, 'PAS'], '55': [153, 'PAS'], '56': [138, 'PAS'], '58': [358, 'PAS'], '59': [407, 'PAS'],
  '60': [407, 'PAS'], '61': [700, 'PAS'], '62': [447, 'PAS'], '63': [447, 'PAS'], '66': [654, 'PAS'], '68': [219, 'PAS'],
  '69': [252, 'PAS'], '70': [252, 'PAS'], '71': [252, 'PAS'], '72': [252, 'PAS'], '73': [252, 'PAS'], '74': [252, 'PAS'],
  '75': [252, 'PAS'], '77': [365, 'PAS'], '78': [57, 'PAS'], '79': [261, 'PAS'], '80': [97, 'PAS'], '81': [69, 'PAS'],
  '82': [102, 'PAS'], '90': [132, 'PAS'], '91': [132, 'PAS'], '93': [132, 'PAS'], '95': [134, 'PAS'], '96': [111, 'PAS'],
  // Contas Nacionais 2021 × 1,62 (ramos sem pesquisa anual)
  '01': [137, 'SCN'], '02': [109, 'SCN'], '03': [109, 'SCN'], '35': [4221, 'SCN'], '36': [286, 'SCN'], '64': [765, 'SCN'],
  '65': [765, 'SCN'], '84': [343, 'SCN'], '85': [88, 'SCN'], '86': [158, 'SCN'], '87': [158, 'SCN'], '88': [158, 'SCN'],
  '92': [74, 'SCN'], '94': [69, 'SCN'], '97': [18, 'SCN'], '99': [69, 'SCN'],
};


type Faixa = [number, number, number];

const T = TABELA as unknown as {
  industria: { classes: Record<string, number>; grupos: Record<string, number>; divisoes: Record<string, number>; porte: Faixa[] };
  comercio: { classes: Record<string, number>; grupos: Record<string, number>; divisoes: Record<string, number>; porte: Record<string, Faixa[]> };
  construcao: { grupos: Record<string, Faixa[]> };
  servicos: { porte: Record<string, [number, number]> };
};

/** A fonte como aparece na explicação; as tabelas completas estão no JSON e no anexo da US-0006. */
const FONTE_CURTA = {
  industria: 'IBGE, PIA-Empresa 2024',
  comercio: 'IBGE, PAC 2024',
  construcao: 'IBGE, PAIC 2024',
} as const;

const MAIS_DE = 1e8;
const textoDaFaixa = ([de, ate]: Faixa) => (ate >= MAIS_DE ? `${de} ou mais pessoas` : `${de} a ${ate} pessoas`);
/** A faixa em que a empresa cai; abaixo da primeira, a primeira. */
const faixaDe = (faixas: Faixa[], pessoas: number) => faixas.find(([de, ate]) => pessoas >= de && pessoas <= ate) ?? faixas[0];

/** Classe, grupo ou divisão: o nível mais específico com valor. */
function maisEspecifico(cnae: string, tabela: { classes: Record<string, number>; grupos: Record<string, number>; divisoes: Record<string, number> }) {
  const classe = cnae.slice(0, 4);
  const grupo = cnae.slice(0, 3);
  if (tabela.classes[classe]) return { base: tabela.classes[classe], nivel: `classe ${classe}` };
  if (tabela.grupos[grupo]) return { base: tabela.grupos[grupo], nivel: `grupo ${grupo}` };
  const divisao = cnae.slice(0, 2);
  return tabela.divisoes[divisao] ? { base: tabela.divisoes[divisao], nivel: `divisão ${divisao}` } : null;
}

function comFator(cnae: string, pessoas: number, tabela: Parameters<typeof maisEspecifico>[1], faixas: Faixa[] | undefined, fonte: string): ReceitaPorPessoa | null {
  const achado = maisEspecifico(cnae, tabela);
  if (!achado || !faixas?.length) return null;
  const faixa = faixaDe(faixas, pessoas);
  return { mil: Math.trunc(achado.base * faixa[2]), fonte, nivel: achado.nivel, porte: textoDaFaixa(faixa) };
}

function construcao(cnae: string, pessoas: number): ReceitaPorPessoa | null {
  const grupo = cnae.slice(0, 3);
  const faixas = T.construcao.grupos[grupo] ?? T.construcao.grupos[cnae.slice(0, 2)];
  if (!faixas) return null;
  const faixa = faixaDe(faixas, pessoas);
  const nivel = T.construcao.grupos[grupo] ? `grupo ${grupo}` : `divisão ${cnae.slice(0, 2)}`;
  return { mil: faixa[2], fonte: FONTE_CURTA.construcao, nivel, porte: textoDaFaixa(faixa) };
}

function pelaDivisao(divisao: string, pessoas: number): ReceitaPorPessoa | null {
  const linha = RECEITA_POR_PESSOA[divisao];
  if (!linha) return null;
  const fatores = T.servicos.porte[divisao];
  if (!fatores) return { mil: linha[0], fonte: FONTES[linha[1]], nivel: `divisão ${divisao}`, porte: null };
  const grande = pessoas >= 20;
  return {
    mil: Math.trunc(linha[0] * fatores[grande ? 1 : 0]),
    fonte: FONTES[linha[1]],
    nivel: `divisão ${divisao}`,
    porte: grande ? '20 ou mais pessoas' : 'menos de 20 pessoas',
  };
}

const eIndustria = (d: string) => d >= '05' && d <= '33';
const eComercio = (d: string) => d >= '45' && d <= '47';
const eConstrucao = (d: string) => d >= '41' && d <= '43';

/** A receita por pessoa para uma empresa do CNAE dado, com tantas pessoas. */
export function receitaPorPessoa(cnae: string, pessoas: number): ReceitaPorPessoa | null {
  const d = cnae.slice(0, 2);
  const especifica =
    (eIndustria(d) && comFator(cnae, pessoas, T.industria, T.industria.porte, FONTE_CURTA.industria)) ||
    (eComercio(d) && comFator(cnae, pessoas, T.comercio, T.comercio.porte[d], FONTE_CURTA.comercio)) ||
    (eConstrucao(d) && construcao(cnae, pessoas)) ||
    null;
  return especifica ?? pelaDivisao(d, pessoas);
}
