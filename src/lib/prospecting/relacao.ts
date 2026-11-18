import { RELACOES } from '../../../supabase/functions/_shared/relacao';
import { formatarData } from '@/lib/prospecting/prazos';
import { PROJECT_STATUS_LABELS } from '@/types/project';
import { getDiscardReasonLabel, getProspectStageLabel, type ProspectStage } from '@/types/prospect';
import type { Opcao } from '@/types/filtrosReceita';
import type { OportunidadeDaRelacao, ProjetoDaRelacao, Relacao, RelacaoDaEmpresa } from '@/types/relacao';

/**
 * Como a tela mostra a relação da Origami com a empresa (US-0019). A regra que decide a relação
 * mora em supabase/functions/_shared/relacao.ts; aqui só rótulos e textos.
 */

export const RELACOES_DA_ORIGAMI: ReadonlyArray<Opcao<Relacao>> = RELACOES;

export const SEM_SUCESSO: Relacao = 'sem_sucesso';

export function rotuloDaRelacao(relacao: Relacao): string {
  return RELACOES.find((r) => r.valor === relacao)?.rotulo ?? relacao;
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
  sem_sucesso: (r, nomeDe) => [r.oportunidade && textoDaPerda(r.oportunidade, nomeDe)],
};

/** As linhas do detalhe da marca (cenários 1 a 5). */
export function detalheDaRelacao(r: RelacaoDaEmpresa, nomeDe: NomeDe): string[] {
  return DETALHES[r.relacao](r, nomeDe).filter((l): l is string => !!l);
}
