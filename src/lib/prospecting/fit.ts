import { industrySignal } from '@/lib/prospecting/industria';
import { isSituacaoAtiva, leiDoBemSignal } from '@/lib/prospecting/receita';
import { sugerirTipoDeConta } from '@/lib/prospecting/tipoDeConta';
import type { ProspectCompanyDB, TipoDeConta } from '@/types/prospect';
import type { CompanyFit, FitFront, FitReason, FundingSignals, LeiDoBemSignal, SinaisDoTamanho } from '@/types/receita';

/**
 * Fit por serviço da Origami (US-0014, 24/11/2026; antes, três frentes de 29/09/2026), de 0 a
 * 100 — regra explícita, sem IA (ADR-0042, ADR-0055).
 *
 * Quatro serviços: Studio de Produto, Lei do Bem, Captação de recursos e Consultoria
 * Estratégica. Em cada um, a soma dos pontos máximos é exatamente 100; a dívida ativa ajuizada
 * só tira. Cada ponto vem com o motivo, porque nota que não explica não é usada.
 *
 * O tamanho real (funcionários), a dívida, a distância de Formiga e o faturamento vêm da Base
 * da Receita: na Base, da própria linha; no Pulse, do retrato gravado na empresa, com o que o
 * time informou por cima. Sinal que falta não soma nem tira.
 *
 * Empresa que não está ATIVA na Receita tem fit 0 em tudo; fora do Lucro Real, a Lei do Bem é
 * 0. Sem dados da Receita, não há nota (null) — "não sei" é diferente de "não serve".
 */

const FONTE_PRINCIPAL = 'principal';
const LEI_DO_BEM_ELEGIVEL: LeiDoBemSignal = 'elegivel';
const FORA_DO_LUCRO_REAL: LeiDoBemSignal = 'nao_elegivel';
const NUNCA_USOU: FundingSignals['leiDoBem'] = 'nunca_usou';
const JA_USA: FundingSignals['leiDoBem'] = 'ja_usa';
const SINAL_PD = 'P&D / inovação';
const SINAIS_DE_MATURIDADE = new Set(['Certificação ISO', 'Exportação']);
const SINAIS_DE_FABRICA = new Set(['MES / chão de fábrica', 'Indústria 4.0', 'Automação industrial', 'Vagas de TI', 'Portal do fornecedor']);
const MINAS_GERAIS = 'MG';
const LEI_DO_BEM: FitFront = 'lei_do_bem';
const ORDEM_DOS_TIPOS: readonly TipoDeConta[] = ['satelite', 'ponte', 'ancora'];

type Pontos = Array<[number, string]>;

const somar = (pontos: Pontos) => Math.max(0, Math.min(100, pontos.reduce((t, [p]) => t + p, 0)));
const motivos = (pontos: Pontos): FitReason[] => pontos.filter(([p]) => p !== 0).map(([pontos, texto]) => ({ pontos, texto }));

function anosDesde(data?: string | null): number | null {
  if (!data) return null;
  return (Date.now() - new Date(`${data}T00:00:00`).getTime()) / (365.25 * 86400000);
}

// ---------- sinais da Base (US-0014) ----------

/** Os sinais do tamanho de uma empresa do Pulse: o que o time informou, senão o retrato da Base. */
export function sinaisDaEmpresa(e: ProspectCompanyDB): SinaisDoTamanho {
  const doTime = e.funcionarios_informados != null;
  const estimado = e.base_faturamento_base && e.base_faturamento_base !== 'piso' ? e.base_faturamento_estimado ?? null : null;
  const faturamento = e.faturamento_anual ?? estimado;
  const pelaFaixa = sugerirTipoDeConta(faturamento == null ? null : Number(faturamento));
  return {
    funcionarios: doTime ? e.funcionarios_informados ?? null : e.base_funcionarios ?? null,
    funcionariosDoTime: doTime,
    dividaAjuizada: e.base_divida_ajuizada == null ? null : Number(e.base_divida_ajuizada),
    distanciaKm: e.base_distancia_km ?? null,
    tipoConta: e.tipo_conta ?? pelaFaixa,
    tipoPeloFaturamento: !e.tipo_conta && !!pelaFaixa,
    uf: e.receita?.endereco?.uf ?? null,
  };
}

type Faixas = readonly [number, number, number, number];

/** Funcionários 50–99 / 100–249 / 250–999 / 1.000+. */
function funcionariosPontos(s: SinaisDoTamanho, faixas: Faixas): [number, string] {
  const n = s.funcionarios;
  if (n == null || n < 50) return [0, ''];
  const i = n >= 1000 ? 3 : n >= 250 ? 2 : n >= 100 ? 1 : 0;
  const rotulo = ['50 a 99', '100 a 249', '250 a 999', '1.000 ou mais'][i];
  return [faixas[i], `${rotulo} funcionários (${s.funcionariosDoTime ? 'confirmados pelo time' : 'RAIS'})`];
}

const ROTULO_DO_TIPO: Record<TipoDeConta, string> = { satelite: 'Satélite', ponte: 'Ponte', ancora: 'Âncora' };

/** Satélite / Ponte / Âncora — a classificação do time, ou a faixa do faturamento. */
function tipoPontos(s: SinaisDoTamanho, pesos: readonly [number, number, number]): [number, string] {
  if (!s.tipoConta) return [0, ''];
  const i = ORDEM_DOS_TIPOS.indexOf(s.tipoConta);
  return [pesos[i], `${ROTULO_DO_TIPO[s.tipoConta]}${s.tipoPeloFaturamento ? ' (pelo faturamento)' : ''}`];
}

/** Até 150 km / até 300 km de Formiga: presencial custa menos. */
function distanciaPontos(s: SinaisDoTamanho, perto: number, medio: number): [number, string] {
  const km = s.distanciaKm;
  if (km == null || km > 300) return [0, ''];
  return [km <= 150 ? perto : medio, `A ${km.toLocaleString('pt-BR')} km de Formiga`];
}

/** Dívida ativa ajuizada só tira pontos. */
function dividaPontos(s: SinaisDoTamanho, peso: number, motivo: string): [number, string] {
  return s.dividaAjuizada && s.dividaAjuizada > 0 ? [-peso, `Dívida ativa ajuizada${motivo}`] : [0, ''];
}

/** Porte "média ou grande" é só um piso: a Base é toda média ou grande. */
function portePontos(porte: string | null | undefined, peso: number): [number, string] {
  if (!porte || /micro|pequeno/i.test(porte)) return [0, ''];
  return [peso, 'Média ou grande empresa'];
}

function idadePontos(empresa: ProspectCompanyDB, anos: number, peso: number): [number, string] {
  const idade = anosDesde(empresa.data_abertura);
  return [idade != null && idade >= anos ? peso : 0, `Mais de ${anos} anos de operação`];
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

const contratosComGoverno = (fomento: FundingSignals | null) => fomento?.governo?.contratos ?? 0;

function governoPontos(fomento: FundingSignals | null): [number, string] {
  const contratos = contratosComGoverno(fomento);
  return [contratos > 0 ? 10 : 0, `Vende para o governo federal (${contratos} contrato(s)) — porte real`];
}

// ---------- os quatro serviços (pesos aprovados em 23/11/2026; cada coluna soma 100) ----------

/** Studio de Produto: software sob medida e integração na indústria. */
function studioPontos(e: ProspectCompanyDB, s: SinaisDoTamanho): Pontos {
  const { sistemas, sinais } = sinaisDoSite(e);
  const deFabrica = sinais.filter((x) => SINAIS_DE_FABRICA.has(x));
  return [
    industriaPontos(e, 30, 18),
    funcionariosPontos(s, [5, 10, 20, 25]),
    tipoPontos(s, [6, 12, 15]),
    distanciaPontos(s, 5, 2),
    portePontos(e.porte, 5),
    idadePontos(e, 5, 5),
    [sistemas.length > 0 ? 10 : 0, `Site cita ${sistemas.join(', ')} — sistema para integrar`],
    [Math.min(5, deFabrica.length * 3), `Site fala em ${deFabrica.join(', ')}`],
    dividaPontos(s, 5, ''),
  ];
}

const REGIME_NA_LEI_DO_BEM: Record<LeiDoBemSignal, [number, string]> = {
  elegivel: [35, 'Lucro Real — pode usar a Lei do Bem'],
  sem_regime: [10, 'Regime não informado — confirmar se é Lucro Real'],
  nao_elegivel: [0, ''],
};

function leiDoBemFomento(fomento: FundingSignals | null, lucroReal: boolean): [number, string] {
  if (lucroReal && fomento?.leiDoBem === NUNCA_USOU) return [10, 'Lucro Real e fora da Lei do Bem desde 2024 — oportunidade aberta'];
  if (fomento?.leiDoBem === JA_USA) return [5, 'Já declara a Lei do Bem — argumento é fazer melhor'];
  return [0, ''];
}

/** Lei do Bem: só para o Lucro Real (fora dele, nota 0, em `notaDoServico`). */
function leiDoBemPontos(e: ProspectCompanyDB, s: SinaisDoTamanho, fomento: FundingSignals | null): Pontos {
  const regime = leiDoBemSignal(e.regime_tributario);
  return [
    s.regimeNaoConsultado ? [0, ''] : REGIME_NA_LEI_DO_BEM[regime],
    industriaPontos(e, 15, 8),
    funcionariosPontos(s, [4, 8, 12, 15]),
    tipoPontos(s, [4, 8, 10]),
    [sinaisDoSite(e).sinais.includes(SINAL_PD) ? 10 : 0, 'Site fala em P&D ou inovação'],
    leiDoBemFomento(fomento, regime === LEI_DO_BEM_ELEGIVEL),
    idadePontos(e, 3, 3),
    portePontos(e.porte, 2),
    dividaPontos(s, 25, ' — o incentivo pede regularidade fiscal'),
  ];
}

/** Captação de recursos: FINEP, BNDES e FAPs — qualquer regime, mas com CND. */
function captacaoPontos(e: ProspectCompanyDB, s: SinaisDoTamanho, fomento: FundingSignals | null): Pontos {
  return [
    industriaPontos(e, 15, 8),
    funcionariosPontos(s, [4, 8, 12, 15]),
    tipoPontos(s, [3, 6, 8]),
    [sinaisDoSite(e).sinais.includes(SINAL_PD) ? 15 : 0, 'Site fala em P&D ou inovação'],
    [fomento?.captouFomento ? 15 : 0, 'Já captou fomento público (FINEP/BNDES) — conhece o caminho'],
    [s.uf === MINAS_GERAIS ? 10 : 0, 'Em Minas Gerais — FAPEMIG'],
    idadePontos(e, 3, 10),
    portePontos(e.porte, 2),
    governoPontos(fomento),
    dividaPontos(s, 30, ' — FINEP e BNDES pedem CND'),
  ];
}

/** Consultoria Estratégica: tamanho, presença e maturidade. */
function consultoriaPontos(e: ProspectCompanyDB, s: SinaisDoTamanho, fomento: FundingSignals | null): Pontos {
  const maturidade = sinaisDoSite(e).sinais.filter((x) => SINAIS_DE_MATURIDADE.has(x));
  return [
    funcionariosPontos(s, [8, 15, 22, 25]),
    portePontos(e.porte, 5),
    industriaPontos(e, 15, 9),
    idadePontos(e, 5, 5),
    distanciaPontos(s, 15, 8),
    tipoPontos(s, [6, 12, 15]),
    [Math.min(10, maturidade.length * 5), `Site fala em ${maturidade.join(' e ')}`],
    governoPontos(fomento),
    dividaPontos(s, 10, ''),
  ];
}

export const ROTULO_DA_FRENTE: Record<FitFront, string> = {
  studio: 'Studio de Produto',
  lei_do_bem: 'Lei do Bem',
  captacao: 'Captação de recursos',
  consultoria: 'Consultoria Estratégica',
};

/** Rótulo curto, para colunas estreitas. */
export const ROTULO_CURTO_DA_FRENTE: Record<FitFront, string> = {
  studio: 'Studio',
  lei_do_bem: 'Lei do Bem',
  captacao: 'Captação',
  consultoria: 'Consultoria',
};

export const FRENTES_DO_FIT: readonly FitFront[] = ['studio', 'lei_do_bem', 'captacao', 'consultoria'];

type Calculo = (e: ProspectCompanyDB, s: SinaisDoTamanho, f: FundingSignals | null) => Pontos;

const PONTOS_DO_SERVICO: Record<FitFront, Calculo> = {
  studio: studioPontos,
  lei_do_bem: leiDoBemPontos,
  captacao: captacaoPontos,
  consultoria: consultoriaPontos,
};

/** Por que o serviço tem nota 0 de saída; nulo quando a conta segue. */
function zeradoPor(frente: FitFront, empresa: ProspectCompanyDB): string | null {
  if (!isSituacaoAtiva(empresa.situacao_cadastral)) return `Situação na Receita: ${empresa.situacao_cadastral}`;
  if (frente === LEI_DO_BEM && leiDoBemSignal(empresa.regime_tributario) === FORA_DO_LUCRO_REAL) return 'Fora do Lucro Real: a Lei do Bem não se aplica';
  return null;
}

/**
 * O fit de cada serviço. `sinais` vem da Base (fit prévio da carga e da ficha); sem ele, do
 * retrato gravado na empresa do Pulse (`sinaisDaEmpresa`).
 */
export function companyFit(empresa: ProspectCompanyDB, fomento: FundingSignals | null = null, sinais?: SinaisDoTamanho): CompanyFit[] | null {
  if (!empresa.receita_consultada_em) return null;
  const s = sinais ?? sinaisDaEmpresa(empresa);
  return FRENTES_DO_FIT.map((frente) => {
    const zerado = zeradoPor(frente, empresa);
    const lista = zerado ? [] : PONTOS_DO_SERVICO[frente](empresa, s, fomento);
    return {
      frente,
      rotulo: ROTULO_DA_FRENTE[frente],
      nota: zerado ? 0 : somar(lista),
      motivos: zerado ? [{ pontos: 0, texto: zerado }] : motivos(lista),
    };
  });
}

/**
 * Abaixo disso nenhum serviço se destaca (24/11/2026): a maior nota sai de pontos que quase toda
 * empresa tem (porte, idade), e apontar "o serviço de maior fit" enganaria. A ordem não muda.
 */
export const FIT_QUE_DESTACA = 20;

/** O serviço que se destaca, ou nulo quando a maior nota não passa de `FIT_QUE_DESTACA`. */
export function servicoEmDestaque(fits: CompanyFit[] | null): CompanyFit | null {
  const melhor = bestFit(fits);
  return melhor && melhor.nota >= FIT_QUE_DESTACA ? melhor : null;
}

/** A maior nota entre os serviços — o que ordena a tela Empresas por padrão. */
export function bestFit(fits: CompanyFit[] | null): CompanyFit | null {
  if (!fits) return null;
  return fits.reduce((melhor, f) => (f.nota > melhor.nota ? f : melhor));
}
