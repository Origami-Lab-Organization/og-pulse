import {
  SEM_SERVICO,
  SEPARADOR_DA_ESCOLHA,
  SEPARADOR_LINHA_SERVICO,
  STATUS_DO_SERVICO,
  type StatusDoServico,
} from '@/lib/catalogo.constants';
import { rotuloDoModelo, temFormaAntiga } from '@/lib/formasDeReceita';
import type { Service } from '@/types/service';
import { SERVICE_LINE_LABELS, type ServiceLine } from '@/types/serviceLine';
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

// ─── Filtro por linha e serviço (US-0048) ───────────────────────────────────────

/** Linha e serviço escolhidos num filtro; `servicoId` pode ser `SEM_SERVICO`. */
export interface EscolhaDoFiltro {
  linhaId: string | null;
  servicoId: string | null;
}

export const FILTRO_VAZIO: EscolhaDoFiltro = { linhaId: null, servicoId: null };

/** Ids de serviço que o filtro aceita; `null` = sem filtro; `SEM_SERVICO` = só projetos sem serviço. */
export function servicosDoFiltro(escolha: EscolhaDoFiltro, services: readonly Service[]): string[] | typeof SEM_SERVICO | null {
  if (escolha.servicoId === SEM_SERVICO) return SEM_SERVICO;
  if (escolha.servicoId) return [escolha.servicoId];
  if (escolha.linhaId) return services.filter((s) => s.serviceLineId === escolha.linhaId).map((s) => s.id);
  return null;
}

/** O projeto (pelo `service_line`) passa no filtro. */
export function projetoNoFiltro(serviceLine: string | null, aceitos: string[] | typeof SEM_SERVICO | null): boolean {
  if (aceitos === null) return true;
  if (aceitos === SEM_SERVICO) return !serviceLine;
  return !!serviceLine && aceitos.includes(serviceLine);
}

/** Um grupo de opções do filtro; sem título, as opções vêm soltas no topo. */
export interface GrupoDoFiltro {
  titulo: string | null;
  opcoes: OpcaoSimples[];
}

const TITULO_DOS_DESATIVADOS = 'Desativados';

const porNome = (a: OpcaoSimples, b: OpcaoSimples) => a.rotulo.localeCompare(b.rotulo, 'pt-BR');
const comOpcoes = (grupos: GrupoDoFiltro[]) => grupos.filter((g) => g.opcoes.length > 0);

/** Linhas ativas no topo; desativadas num grupo próprio (US-0048). */
export function linhasDoFiltro(lines: readonly ServiceLine[]): GrupoDoFiltro[] {
  const opcao = (l: ServiceLine) => ({ id: l.id, rotulo: l.name, desativado: !l.isActive });
  return comOpcoes([
    { titulo: null, opcoes: lines.filter((l) => l.isActive).map(opcao) },
    { titulo: TITULO_DOS_DESATIVADOS, opcoes: lines.filter((l) => !l.isActive).map(opcao) },
  ]);
}

/**
 * Serviços do filtro (US-0048). Com linha escolhida, os serviços dela pelo nome; sem linha, um
 * grupo por linha ativa, com o nome da linha como título. Os que saíram das escolhas
 * (desativados, sem modelo ou de linha desativada) vão para o grupo Desativados.
 */
export function servicosNoFiltro(services: readonly Service[], lines: readonly ServiceLine[], linhaId: string | null): GrupoDoFiltro[] {
  const daLinha = services.filter((s) => !linhaId || s.serviceLineId === linhaId);
  const disponiveis = daLinha.filter((s) => servicoDisponivel(s, lines));
  const fora = daLinha.filter((s) => !servicoDisponivel(s, lines));
  const opcao = (s: Service, comLinha: boolean) => ({
    id: s.id,
    rotulo: comLinha ? rotuloDoServico(s, lines) : s.name,
    desativado: !servicoDisponivel(s, lines),
  });
  const ativos: GrupoDoFiltro[] = linhaId
    ? [{ titulo: null, opcoes: disponiveis.map((s) => opcao(s, false)).sort(porNome) }]
    : lines
        .filter((l) => l.isActive)
        .map((l) => ({ titulo: l.name, opcoes: disponiveis.filter((s) => s.serviceLineId === l.id).map((s) => opcao(s, false)).sort(porNome) }));
  return comOpcoes([...ativos, { titulo: TITULO_DOS_DESATIVADOS, opcoes: fora.map((s) => opcao(s, !linhaId)).sort(porNome) }]);
}

/** "Linha › Serviço" do projeto; projetos antigos com código fixo mostram o rótulo do código. */
export function rotuloDoServicoDoProjeto(
  serviceLine: string | null,
  services: readonly Service[],
  lines: readonly ServiceLine[],
): string | null {
  if (!serviceLine) return null;
  const service = services.find((s) => s.id === serviceLine);
  if (service) return rotuloDoServico(service, lines);
  return SERVICE_LINE_LABELS[serviceLine] ?? null;
}

/** Linha e serviço do projeto, separados para o ícone e a etiqueta (US-0048). */
export interface ServicoDoProjeto {
  linha: { nome: string; icone: ServiceLine['icone'] } | null;
  servico: string;
}

export function servicoDoProjeto(
  serviceLine: string | null,
  services: readonly Service[],
  lines: readonly ServiceLine[],
): ServicoDoProjeto | null {
  if (!serviceLine) return null;
  const service = services.find((s) => s.id === serviceLine);
  if (!service) {
    // Projeto antigo, com a chave fixa de antes do catálogo: só o nome, sem linha.
    const antigo = SERVICE_LINE_LABELS[serviceLine];
    return antigo ? { linha: null, servico: antigo } : null;
  }
  const linha = lines.find((l) => l.id === service.serviceLineId);
  return { linha: linha ? { nome: linha.name, icone: linha.icone } : null, servico: service.name };
}
