/**
 * Relação da Origami com uma empresa (US-0019), calculada pelos clientes, projetos e
 * oportunidades do tenant. Mora aqui porque a Edge Function `empresas-receita` calcula e a tela
 * só mostra; a tela importa os tipos e os rótulos daqui.
 *
 * Quando mais de uma vale, vence a primeira desta ordem (decisão de 18/11/2026, ampliada pela
 * US-0010 em 23/11/2026): Cliente ativo → Sendo abordada → Já foi cliente → Retomar → Não agora
 * → Descartada → Abordada sem sucesso.
 */

import type { DadosDaRelacao, DecisaoDaRelacao, OportunidadeDaRelacao, Relacao, RelacaoDaEmpresa } from "./relacaoTipos.ts";

export const RELACOES: ReadonlyArray<{ valor: Relacao; rotulo: string }> = [
  { valor: "cliente_ativo", rotulo: "Cliente ativo" },
  { valor: "sendo_abordada", rotulo: "Sendo abordada" },
  { valor: "ja_foi_cliente", rotulo: "Já foi cliente" },
  { valor: "retomar", rotulo: "Retomar" },
  { valor: "nao_agora", rotulo: "Não agora" },
  { valor: "descartada", rotulo: "Descartada" },
  { valor: "sem_sucesso", rotulo: "Abordada sem sucesso" },
];

/**
 * Parceiro (US-0051) é marca própria, ao lado da relação, mas entra no mesmo filtro: "Parceiro"
 * mostra as empresas marcadas, junto com as relações escolhidas.
 */
export const PARCEIRO = "parceiro";
export const FILTRO_DE_PARCEIRO = { valor: PARCEIRO, rotulo: "Parceiro" } as const;

/** Marcas que saem da lista por padrão e voltam pelo filtro de relação (US-0010). */
export const ESCONDIDAS_POR_PADRAO: ReadonlySet<Relacao> = new Set(["nao_agora", "descartada"]);

const PROJETO_ABERTO = new Set(["planning", "active", "paused"]);
const GANHO = new Set(["ganho", "convertido"]);
const PERDA = new Set(["descartado", "sem_resposta"]);
const ENCERRADA = new Set([...GANHO, ...PERDA]);
const PEDIU_PARA_PARAR = "pediu_para_parar";
const MESES_DA_PERDA = 12;

const maisRecente = <T extends { data: string | null }>(itens: T[]): T | null =>
  [...itens].sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""))[0] ?? null;

/** Data de corte da Perda: 12 meses antes de hoje (AAAA-MM-DD). */
export function corteDaPerda(hoje: Date): string {
  const corte = new Date(hoje);
  corte.setMonth(corte.getMonth() - MESES_DA_PERDA);
  return corte.toISOString().slice(0, 10);
}

function semSucesso(oportunidades: OportunidadeDaRelacao[], hoje: Date): RelacaoDaEmpresa | null {
  const ultima = maisRecente(oportunidades.filter((o) => ENCERRADA.has(o.stage)));
  if (!ultima || !PERDA.has(ultima.stage)) return null;
  const pediuParaParar = ultima.discard_reason === PEDIU_PARA_PARAR;
  // "Pediu para parar" é pedido da empresa: avisa mesmo depois dos 12 meses (hipótese da US-0019).
  const recente = (ultima.data ?? "") >= corteDaPerda(hoje);
  if (!pediuParaParar && !recente) return null;
  return { relacao: "sem_sucesso", pediuParaParar, projeto: null, oportunidade: ultima };
}

/** AAAA-MM-DD de hoje no fuso de Brasília: é o dia em que o "Não agora" vence. */
export function diaDeHoje(hoje: Date): string {
  return hoje.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** A marca da decisão: "Não agora" vira "Retomar" quando a data chega (US-0010). */
function pelaDecisao(decisao: DecisaoDaRelacao, hoje: Date): RelacaoDaEmpresa {
  const vencida = decisao.decisao === "nao_agora" && (decisao.voltar_em ?? "") <= diaDeHoje(hoje);
  const relacao: Relacao = decisao.decisao === "descartada" ? "descartada" : vencida ? "retomar" : "nao_agora";
  return { relacao, pediuParaParar: false, projeto: null, oportunidade: null, decisao };
}

export function relacaoDaEmpresa(dados: DadosDaRelacao, hoje: Date): RelacaoDaEmpresa | null {
  const { projetos, oportunidades } = dados;
  const emAndamento = oportunidades.find((o) => !ENCERRADA.has(o.stage)) ?? null;
  const aberto = projetos.find((p) => PROJETO_ABERTO.has(p.status));
  if (aberto) return { relacao: "cliente_ativo", pediuParaParar: false, projeto: aberto, oportunidade: emAndamento };
  if (emAndamento) return { relacao: "sendo_abordada", pediuParaParar: false, projeto: null, oportunidade: emAndamento };
  return jaFoiCliente(dados) ?? depoisDoCliente(dados, hoje);
}

/**
 * Projeto, Ganho ou a marca "Cliente antes do Pulse" (US-0051). Estar no cadastro de clientes
 * não basta: orçamento não faz cliente (US-0045), e a Base concorda com a carteira (US-0052).
 */
function jaFoiCliente(dados: DadosDaRelacao): RelacaoDaEmpresa | null {
  const { projetos, oportunidades, antesDoPulse = null } = dados;
  const ganho = maisRecente(oportunidades.filter((o) => GANHO.has(o.stage)));
  if (!projetos.length && !ganho && antesDoPulse == null) return null;
  return { relacao: "ja_foi_cliente", pediuParaParar: false, projeto: maisRecente(projetos), oportunidade: ganho, antesDoPulse };
}

function depoisDoCliente(dados: DadosDaRelacao, hoje: Date): RelacaoDaEmpresa | null {
  if (dados.decisao) return pelaDecisao(dados.decisao, hoje);
  return semSucesso(dados.oportunidades, hoje);
}

/** Raiz do CNPJ (8 dígitos), com ou sem máscara; nulo se não der. */
export function raizDoCnpj(cnpj: string | null | undefined): string | null {
  const digitos = (cnpj ?? "").replace(/\D/g, "");
  return digitos.length === 14 ? digitos.slice(0, 8) : null;
}
