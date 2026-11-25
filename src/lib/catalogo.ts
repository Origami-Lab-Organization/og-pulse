import { SEPARADOR_DA_ESCOLHA, SEPARADOR_LINHA_SERVICO, STATUS_DO_SERVICO, type StatusDoServico } from '@/lib/catalogo.constants';
import { rotuloDoModelo, temFormaAntiga } from '@/lib/formasDeReceita';
import type { Service } from '@/types/service';
import type { ServiceLine } from '@/types/serviceLine';
import type { ServiceRevenueModel } from '@/types/serviceRevenueModel';

/**
 * Regras de escolha do catálogo (US-0046): o serviço aparece com a linha, porque o mesmo nome
 * pode existir em duas linhas, e serviço ou linha desativados saem da escolha de registros novos
 * sem sumir dos registros que já os usam.
 */

const linhaDoServico = (service: Service, lines: readonly ServiceLine[]) =>
  lines.find((line) => line.id === service.serviceLineId);

/** Serviço ativo numa linha ativa (ou sem linha). */
export function servicoDisponivel(service: Service, lines: readonly ServiceLine[]): boolean {
  const linha = linhaDoServico(service, lines);
  return service.isActive && (linha?.isActive ?? true);
}

export function rotuloDoServico(service: Service, lines: readonly ServiceLine[]): string {
  const linha = linhaDoServico(service, lines);
  return linha ? `${linha.name}${SEPARADOR_LINHA_SERVICO}${service.name}` : service.name;
}

/**
 * Situação do serviço (US-0046). O banco deriva `isActive` (não desativado e com modelo de
 * receita); aqui a tela separa o motivo, porque "sem modelo" pede uma ação e "desativado" não.
 */
export function statusDoServico(service: Service, lines: readonly ServiceLine[]): StatusDoServico {
  if (service.desativado) return STATUS_DO_SERVICO.DESATIVADO;
  if (linhaDoServico(service, lines)?.isActive === false) return STATUS_DO_SERVICO.LINHA_DESATIVADA;
  return service.isActive ? STATUS_DO_SERVICO.ATIVO : STATUS_DO_SERVICO.SEM_MODELO;
}

/** O serviço aparece na aba Desativados, e não na aba da linha. */
export const foraDasAbasDeLinha = (service: Service, lines: readonly ServiceLine[]): boolean =>
  service.desativado || linhaDoServico(service, lines)?.isActive === false;

/** Status no painel, enquanto a pessoa edita: a regra do banco aplicada ao rascunho. */
export const statusDoRascunho = (desativado: boolean, temModeloValido: boolean): StatusDoServico => {
  if (desativado) return STATUS_DO_SERVICO.DESATIVADO;
  return temModeloValido ? STATUS_DO_SERVICO.ATIVO : STATUS_DO_SERVICO.SEM_MODELO;
};

export interface EscolhaDeServico {
  serviceId: string;
  modelId: string | null;
}

/** Valor único da escolha "serviço + modelo de receita" do projeto (US-0046). */
export const valorDaEscolha = (escolha: EscolhaDeServico): string =>
  escolha.modelId ? `${escolha.serviceId}${SEPARADOR_DA_ESCOLHA}${escolha.modelId}` : escolha.serviceId;

export function lerEscolha(valor: string): EscolhaDeServico {
  const [serviceId, modelId] = valor.split(SEPARADOR_DA_ESCOLHA);
  return { serviceId: serviceId ?? '', modelId: modelId || null };
}

export interface OpcaoSimples {
  id: string;
  rotulo: string;
  /** Só aparece porque o projeto já a usa. */
  desativado: boolean;
}

/** Linhas ativas, mais a linha do serviço do projeto quando ela foi desativada (US-0046). */
export function linhasParaEscolha(lines: readonly ServiceLine[], linhaAtual: string | null): OpcaoSimples[] {
  return lines
    .filter((l) => l.isActive || l.id === linhaAtual)
    .map((l) => ({ id: l.id, rotulo: l.name, desativado: !l.isActive }));
}

/** Serviços disponíveis da linha, mais o serviço do projeto quando ele saiu das escolhas. */
export function servicosParaEscolha(
  services: readonly Service[],
  lines: readonly ServiceLine[],
  linhaId: string | null,
  servicoAtual: string | null,
): OpcaoSimples[] {
  return services
    .filter((s) => s.serviceLineId === linhaId && (servicoDisponivel(s, lines) || s.id === servicoAtual))
    .map((s) => ({ id: s.id, rotulo: s.name, desativado: !servicoDisponivel(s, lines) }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
}

/** Modelos de receita válidos do serviço, mais o modelo do projeto quando ele não está entre eles. */
export function modelosParaEscolha(
  models: readonly ServiceRevenueModel[],
  servicoId: string | null,
  modeloAtual: string | null,
): OpcaoSimples[] {
  const validos = (m: ServiceRevenueModel) => m.isActive && !temFormaAntiga(m.formas);
  return models
    .filter((m) => m.serviceId === servicoId && (validos(m) || m.id === modeloAtual))
    .map((m) => ({ id: m.id, rotulo: rotuloDoModelo(m.formas), desativado: !validos(m) }));
}
