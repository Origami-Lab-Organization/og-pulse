import {
  FORMA_DE_RECEITA,
  FORMAS_ANTIGAS,
  FORMAS_VENDIDAS,
  MODEL_TYPE_DA_COMPOSICAO,
  ROTULO_DA_FORMA,
  SEPARADOR_DAS_FORMAS,
} from '@/lib/formasDeReceita.constants';
import type { FormaDeReceita, FormaQualquer, ServiceRevenueModel } from '@/types/serviceRevenueModel';

/**
 * Regras do modelo de receita (US-0046): um conjunto de uma ou mais formas de receita. O banco aplica as mesmas regras no
 * gatilho `trg_service_revenue_models_composicao`; aqui elas existem para a tela avisar antes
 * de enviar.
 */

const ORDEM_DE_EXIBICAO: readonly FormaQualquer[] = [...FORMAS_VENDIDAS, ...FORMAS_ANTIGAS];

const posicao = (forma: FormaQualquer) => ORDEM_DE_EXIBICAO.indexOf(forma);

/** Formas sem repetição, na ordem de exibição. */
export function ordenarFormas<T extends FormaQualquer>(formas: readonly T[]): T[] {
  return [...new Set(formas)].sort((a, b) => posicao(a) - posicao(b));
}

/** Chave de comparação, igual à que o banco usa (ordem alfabética). */
const chaveDoModelo = (formas: readonly FormaQualquer[]) => [...new Set(formas)].sort().join('|');

export const rotuloDoModelo = (formas: readonly FormaQualquer[]): string =>
  ordenarFormas(formas).map((forma) => ROTULO_DA_FORMA[forma]).join(SEPARADOR_DAS_FORMAS);

export const temFormaAntiga = (formas: readonly FormaQualquer[]): boolean =>
  formas.some((forma) => (FORMAS_ANTIGAS as readonly FormaQualquer[]).includes(forma));

export const temPercentual = (formas: readonly FormaQualquer[]): boolean =>
  formas.includes(FORMA_DE_RECEITA.PERCENTUAL);

/** O que o banco grava em `model_type` para estas formas. */
export const modelTypeDoModelo = (formas: readonly FormaDeReceita[]): string => {
  const unicas = ordenarFormas(formas);
  return unicas.length === 1 ? unicas[0] : MODEL_TYPE_DA_COMPOSICAO;
};

/**
 * Seleção no seletor do modelo de receita: marcar Cortesia deixa só ela; marcar outra forma tira a
 * Cortesia, porque ela não combina com nada.
 */
export function alternarForma(atuais: readonly FormaDeReceita[], forma: FormaDeReceita): FormaDeReceita[] {
  if (atuais.includes(forma)) return atuais.filter((f) => f !== forma);
  if (forma === FORMA_DE_RECEITA.CORTESIA) return [forma];
  return ordenarFormas([...atuais.filter((f) => f !== FORMA_DE_RECEITA.CORTESIA), forma]);
}

/** Mensagem do que impede salvar o modelo de receita, ou `null` quando ela é válida. */
export function erroDoModelo(
  formas: readonly FormaDeReceita[],
  outrasDoServico: readonly (readonly FormaQualquer[])[],
): string | null {
  if (formas.length === 0) return 'Escolha ao menos uma forma de receita.';
  if (formas.includes(FORMA_DE_RECEITA.CORTESIA) && formas.length > 1) {
    return 'Cortesia não combina com outra forma de receita.';
  }
  const chave = chaveDoModelo(formas);
  if (outrasDoServico.some((outra) => chaveDoModelo(outra) === chave)) {
    return 'Esse modelo de receita já existe neste serviço.';
  }
  return null;
}

/** Modelos de receita ativos do serviço. */
export const modelosAtivos = (serviceId: string, modelos: readonly ServiceRevenueModel[]) =>
  modelos.filter((c) => c.serviceId === serviceId && c.isActive);

/** O serviço tem algum modelo de receita ativo com Percentual (e, portanto, chance padrão). */
export const servicoTemPercentual = (serviceId: string, modelos: readonly ServiceRevenueModel[]) =>
  modelosAtivos(serviceId, modelos).some((c) => temPercentual(c.formas));
