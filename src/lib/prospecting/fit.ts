import { industrySignal } from '@/lib/prospecting/industria';
import { isSituacaoAtiva, leiDoBemSignal } from '@/lib/prospecting/receita';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { CompanyFit, FitFront, FitReason, FundingSignals, LeiDoBemSignal } from '@/types/receita';

/**
 * Nota de fit por frente da Origami (29/09/2026), de 0 a 100 — regra explícita, sem IA.
 *
 * As frentes são as que a Origami vende hoje: indústria com software sob medida e
 * integração, financiamento de inovação e consultoria. Cada ponto vem com o motivo, porque
 * nota que não explica não é usada: o comercial precisa saber POR QUE a conta está no topo.
 *
 * Empresa que não está ATIVA na Receita tem fit 0 em tudo. Sem dados da Receita, não há
 * nota (null) — "não sei" é diferente de "não serve".
 */

const SISTEMAS_PESO = 15;
const FONTE_PRINCIPAL = 'principal';
const LEI_DO_BEM_ELEGIVEL: LeiDoBemSignal = 'elegivel';
const NUNCA_USOU: FundingSignals['leiDoBem'] = 'nunca_usou';
const JA_USA: FundingSignals['leiDoBem'] = 'ja_usa';
const SINAL_PD = 'P&D / inovação';
const SINAIS_DE_MATURIDADE = new Set(['Certificação ISO', 'Exportação']);
const SINAIS_DE_FABRICA = new Set(['MES / chão de fábrica', 'Indústria 4.0', 'Automação industrial', 'Vagas de TI', 'Portal do fornecedor']);

type Pontos = Array<[number, string]>;

const somar = (pontos: Pontos) => Math.min(100, pontos.reduce((t, [p]) => t + p, 0));
const motivos = (pontos: Pontos): FitReason[] => pontos.filter(([p]) => p > 0).map(([pontos, texto]) => ({ pontos, texto }));

function anosDesde(data?: string | null): number | null {
  if (!data) return null;
  return (Date.now() - new Date(`${data}T00:00:00`).getTime()) / (365.25 * 86400000);
}

function portePontos(porte: string | null | undefined, pesos: [number, number, number]): [number, string] {
  if (!porte) return [0, ''];
  if (/micro/i.test(porte)) return [pesos[2], 'Microempresa'];
  if (/pequeno/i.test(porte)) return [pesos[1], 'Pequena empresa'];
  return [pesos[0], 'Média ou grande empresa'];
}

function industriaPontos(empresa: ProspectCompanyDB, principal: number, secundaria: number): [number, string] {
  const sinal = industrySignal(empresa.receita);
  if (!sinal.industrial) return [0, ''];
  return sinal.fonte === FONTE_PRINCIPAL
    ? [principal, `Indústria (${sinal.ramo})`]
    : [secundaria, `Indústria como atividade secundária (${sinal.ramo})`];
}

function sinaisDoSite(empresa: ProspectCompanyDB) {
  const scan = empresa.site_scan;
  return { sistemas: scan?.sistemas ?? [], sinais: scan?.sinais ?? [] };
}

function softwarePontos(empresa: ProspectCompanyDB): Pontos {
  const { sistemas, sinais } = sinaisDoSite(empresa);
  const deFabrica = sinais.filter((s) => SINAIS_DE_FABRICA.has(s));
  const idade = anosDesde(empresa.data_abertura);
  return [
    industriaPontos(empresa, 40, 25),
    portePontos(empresa.porte, [25, 15, 5]),
    [sistemas.length > 0 ? SISTEMAS_PESO : 0, `Site cita ${sistemas.join(', ')} — sistema para integrar`],
    [Math.min(10, deFabrica.length * 5), `Site fala em ${deFabrica.join(', ')}`],
    [idade != null && idade >= 5 ? 10 : 0, 'Mais de 5 anos de operação'],
  ];
}

const REGIME_PESO: Record<LeiDoBemSignal, [number, string]> = {
  elegivel: [45, 'Lucro Real — pode usar a Lei do Bem'],
  sem_regime: [15, 'Regime não informado — confirmar'],
  nao_elegivel: [5, 'Fora do Lucro Real (Lei do Bem não se aplica; FINEP/FAPs seguem possíveis)'],
};

function fomentoPontos(fomento: FundingSignals | null, lucroReal: boolean): Pontos {
  if (!fomento) return [];
  return [
    [lucroReal && fomento.leiDoBem === NUNCA_USOU ? 10 : 0, 'Lucro Real e nunca declarou a Lei do Bem — oportunidade aberta'],
    [fomento.leiDoBem === JA_USA ? 5 : 0, 'Já declara a Lei do Bem — argumento é fazer melhor'],
    [fomento.captouFomento ? 10 : 0, 'Já captou fomento público (FINEP/BNDES) — conhece o caminho'],
  ];
}

function governoPontos(fomento: FundingSignals | null): Pontos {
  const contratos = fomento?.governo?.contratos ?? 0;
  return [[contratos > 0 ? 10 : 0, `Vende para o governo federal (${contratos} contrato(s)) — porte real`]];
}

function financiamentoPontos(empresa: ProspectCompanyDB, fomento: FundingSignals | null): Pontos {
  const sinal = leiDoBemSignal(empresa.regime_tributario);
  const { sinais } = sinaisDoSite(empresa);
  const idade = anosDesde(empresa.data_abertura);
  return [
    REGIME_PESO[sinal],
    industriaPontos(empresa, 15, 8),
    portePontos(empresa.porte, [15, 10, 3]),
    [sinais.includes(SINAL_PD) ? 10 : 0, 'Site fala em P&D ou inovação'],
    [idade != null && idade >= 3 ? 5 : 0, 'Mais de 3 anos de operação'],
    ...fomentoPontos(fomento, sinal === LEI_DO_BEM_ELEGIVEL),
  ];
}

function consultoriaPontos(empresa: ProspectCompanyDB, fomento: FundingSignals | null): Pontos {
  const { sinais } = sinaisDoSite(empresa);
  const maturidade = sinais.filter((s) => SINAIS_DE_MATURIDADE.has(s));
  const idade = anosDesde(empresa.data_abertura);
  return [
    portePontos(empresa.porte, [40, 25, 10]),
    industriaPontos(empresa, 20, 12),
    [idade != null && idade >= 5 ? 15 : 0, 'Mais de 5 anos de operação'],
    [Math.min(15, maturidade.length * 8), `Site fala em ${maturidade.join(' e ')}`],
    ...governoPontos(fomento),
  ];
}

const FRENTES: Array<{ frente: FitFront; rotulo: string; pontos: (e: ProspectCompanyDB, f: FundingSignals | null) => Pontos }> = [
  { frente: 'software', rotulo: 'Indústria · software e integração', pontos: (e) => softwarePontos(e) },
  { frente: 'financiamento', rotulo: 'Financiamento de inovação', pontos: financiamentoPontos },
  { frente: 'consultoria', rotulo: 'Consultoria', pontos: consultoriaPontos },
];

export function companyFit(empresa: ProspectCompanyDB, fomento: FundingSignals | null = null): CompanyFit[] | null {
  if (!empresa.receita_consultada_em) return null;
  const ativa = isSituacaoAtiva(empresa.situacao_cadastral);
  return FRENTES.map(({ frente, rotulo, pontos }) => {
    const lista = ativa ? pontos(empresa, fomento) : [];
    return {
      frente,
      rotulo,
      nota: ativa ? somar(lista) : 0,
      motivos: ativa ? motivos(lista) : [{ pontos: 0, texto: `Situação na Receita: ${empresa.situacao_cadastral}` }],
    };
  });
}

/** A maior nota entre as frentes — o que ordena a tela Empresas. */
export function bestFit(fits: CompanyFit[] | null): CompanyFit | null {
  if (!fits) return null;
  return fits.reduce((melhor, f) => (f.nota > melhor.nota ? f : melhor));
}
