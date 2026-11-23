import { RELACOES } from '../../../supabase/functions/_shared/relacao';
import { formatarData } from '@/lib/prospecting/prazos';
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { getDiscardReasonLabel, getProspectStageLabel, type ProspectStage } from '@/types/prospect';
import type { Opcao } from '@/types/filtrosReceita';
import { rotuloDoMotivoDoDescarte } from '@/lib/prospecting/decisoesDaBase';
import type { DecisaoDaRelacao, OportunidadeDaRelacao, ProjetoDaRelacao, Relacao, RelacaoDaEmpresa } from '@/types/relacao';

/**
 * Como a tela mostra a relação da Origami com a empresa (US-0019). A regra que decide a relação
 * mora em supabase/functions/_shared/relacao.ts; aqui só rótulos e textos.
 */

export const RELACOES_DA_ORIGAMI: ReadonlyArray<Opcao<Relacao>> = RELACOES;

export const SEM_SUCESSO: Relacao = 'sem_sucesso';

export function rotuloDaRelacao(relacao: Relacao): string {
  return RELACOES.find((r) => r.valor === relacao)?.rotulo ?? relacao;
}

const NAO_AGORA: Relacao = 'nao_agora';

/** O texto do selo: "Não agora até 23/02" leva a data (US-0010); as outras, o rótulo. */
export function rotuloDoSelo(r: RelacaoDaEmpresa): string {
  const ate = r.relacao === NAO_AGORA && r.decisao?.voltar_em ? formatarData(r.decisao.voltar_em).slice(0, 5) : null;
  return ate ? `Não agora até ${ate}` : rotuloDaRelacao(r.relacao);
}

/** "Em andamento" — o rótulo do status do projeto. */
export function statusDoProjeto(status: string): string {
  return PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ?? status;
}

export function etapaDaOportunidade(stage: string): string {
  return getProspectStageLabel(stage as ProspectStage);
}

type NomeDe = (id: string | null) => string;

const data = (valor: string | null) => (valor ? formatarData(valor) : null);

function textoDoProjeto(p: ProjetoDaRelacao): string {
  return `Projeto ${p.name}: ${statusDoProjeto(p.status).toLowerCase()}.`;
}

function textoEmAndamento(o: OportunidadeDaRelacao, nomeDe: NomeDe): string {
  return `Oportunidade em ${etapaDaOportunidade(o.stage)}, com ${nomeDe(o.owner_id)}.`;
}

function textoDaPerda(o: OportunidadeDaRelacao, nomeDe: NomeDe): string {
  const motivo = o.discard_reason ? getDiscardReasonLabel(o.discard_reason) : 'Perda';
  const quando = data(o.data);
  return `${motivo}${quando ? ` em ${quando}` : ''}, com ${nomeDe(o.owner_id)}.`;
}

/** "Descartada por Ana em 23/11/2026: Sem fit." (US-0010). */
function textoDoDescarte(d: DecisaoDaRelacao, nomeDe: NomeDe): string {
  const motivo = d.texto ? `${rotuloDoMotivoDoDescarte(d.motivo)} (${d.texto})` : rotuloDoMotivoDoDescarte(d.motivo);
  return `Descartada por ${nomeDe(d.decidida_por)} em ${formatarData(d.decidida_em.slice(0, 10))}: ${motivo}.`;
}

function textoDoNaoAgora(d: DecisaoDaRelacao, nomeDe: NomeDe): string {
  const origem = d.prospect_id ? ' (Perda "Momento errado" na Qualificação)' : '';
  return `"Não agora" marcado por ${nomeDe(d.decidida_por)} em ${formatarData(d.decidida_em.slice(0, 10))}${origem}; voltar em ${formatarData(d.voltar_em ?? '')}.`;
}

function textoDoGanho(o: OportunidadeDaRelacao): string {
  const quando = data(o.data);
  return `Ganho${quando ? ` em ${quando}` : ''}.`;
}

const DETALHES: Record<Relacao, (r: RelacaoDaEmpresa, nomeDe: NomeDe) => Array<string | null>> = {
  cliente_ativo: (r, nomeDe) => [r.projeto && textoDoProjeto(r.projeto), r.oportunidade && textoEmAndamento(r.oportunidade, nomeDe)],
  sendo_abordada: (r, nomeDe) => [r.oportunidade && textoEmAndamento(r.oportunidade, nomeDe)],
  ja_foi_cliente: (r) => [
    r.projeto ? textoDoProjeto(r.projeto) : null,
    r.oportunidade ? textoDoGanho(r.oportunidade) : null,
    !r.projeto && !r.oportunidade ? 'Está no cadastro de clientes.' : null,
  ],
  retomar: (r, nomeDe) => [r.decisao ? textoDoNaoAgora(r.decisao, nomeDe) : null, 'A data chegou: veja se agora é o momento de qualificar.'],
  nao_agora: (r, nomeDe) => [r.decisao ? textoDoNaoAgora(r.decisao, nomeDe) : null],
  descartada: (r, nomeDe) => [r.decisao ? textoDoDescarte(r.decisao, nomeDe) : null],
  sem_sucesso: (r, nomeDe) => [r.oportunidade && textoDaPerda(r.oportunidade, nomeDe)],
};

/** As linhas do detalhe da marca (cenários 1 a 5). */
export function detalheDaRelacao(r: RelacaoDaEmpresa, nomeDe: NomeDe): string[] {
  return DETALHES[r.relacao](r, nomeDe).filter((l): l is string => !!l);
}
