import type {
  PendingTaskLite,
  ProspectCompanyDB,
  ProspectContactDB,
  ProspectStage,
  ProspectWithCompany,
} from '@/types/prospect';
import { parseRank, parseSegment } from './companySegmentation';

/**
 * Situação da EMPRESA na prospecção, derivada das oportunidades dela (24/09/2026; desde
 * 09/10/2026 cada card é uma oportunidade da empresa, não um contato).
 *
 * Responde uma pergunta só: "posso abordar esta empresa agora?". A regra comercial por trás é
 * não atravessar uma conversa que já existe, nem voltar a quem pediu para parar: basta UMA
 * oportunidade de "Respondeu" em diante para a conta inteira ficar em "Não abordar".
 *
 * Cadência NÃO bloqueia (24/09/2026, Guilherme): é tentativa sem resposta. O quadro sinaliza a
 * segunda oportunidade em cadência com o balão (`ETAPAS_EM_ANDAMENTO`), mas não a proíbe.
 *
 * A ordem da lista é a prioridade — a primeira que se aplica vence.
 */
export type CompanyProspectStatus =
  | 'cliente'
  | 'em_conversa'
  | 'em_cadencia'
  | 'pediu_para_parar'
  | 'na_fila'
  | 'sem_contato'
  | 'sem_retorno';

export type CompanyApproachAction = 'abordar' | 'nao_abordar';

interface CompanyStatusMeta {
  label: string;
  /** O que fazer — a frase curta que acompanha a situação na tabela. */
  hint: string;
  action: CompanyApproachAction;
  /** Classe Tailwind do ponto de situação (tokens do tema — sem hex avulso). */
  dot: string;
}

export const COMPANY_STATUS_META: Record<CompanyProspectStatus, CompanyStatusMeta> = {
  cliente: {
    label: 'Cliente',
    hint: 'Já é cliente — não abordar a frio',
    action: 'nao_abordar',
    dot: 'bg-info',
  },
  em_conversa: {
    label: 'Em conversa',
    hint: 'Alguém do time já está conversando',
    action: 'nao_abordar',
    dot: 'bg-success',
  },
  em_cadencia: {
    label: 'Em cadência',
    hint: 'Tentativas em andamento, ainda sem resposta',
    action: 'abordar',
    dot: 'bg-warning',
  },
  pediu_para_parar: {
    label: 'Pediu para parar',
    hint: 'Não voltar a contatar',
    action: 'nao_abordar',
    dot: 'bg-destructive',
  },
  na_fila: {
    label: 'Na fila',
    hint: 'Oportunidade criada, ainda sem toque',
    action: 'abordar',
    dot: 'bg-muted-foreground/50',
  },
  sem_contato: {
    label: 'Sem oportunidade',
    hint: 'Crie uma oportunidade para começar',
    action: 'abordar',
    dot: 'bg-border',
  },
  sem_retorno: {
    label: 'Sem retorno',
    hint: 'Tentativas encerradas — tente outro contato ou ângulo',
    action: 'abordar',
    dot: 'bg-muted-foreground',
  },
};

export const COMPANY_ACTION_LABEL: Record<CompanyApproachAction, string> = {
  abordar: 'Abordar',
  nao_abordar: 'Não abordar',
};

/**
 * "Em conversa pra frente": a coluna Respondeu e as seguintes. Em cadência NÃO entra — é
 * tentativa, não conversa.
 */
export const ETAPAS_EM_CONVERSA: readonly ProspectStage[] = [
  'respondeu',
  'reuniao_agendada',
  'reuniao_feita',
  'qualificado',
];

/** Vendemos (Ganho) — ou, nas linhas antigas, passou ao Pipeline (Convertido). */
const ETAPAS_DE_CLIENTE: readonly ProspectStage[] = ['ganho', 'convertido'];

/**
 * O balão de atenção do quadro (09/10/2026, Guilherme): a empresa tem OUTRA oportunidade no
 * funil, de "Em cadência" em diante. Antes o balão começava em "Respondeu", porque olhava
 * contatos da mesma conta; com a oportunidade sendo da empresa, uma segunda oportunidade em
 * cadência já é o time abordando a mesma conta duas vezes. "A abordar" não conta (ninguém
 * tocou ainda), e Ganho e Perda também não: saíram do funil.
 */
export const ETAPAS_EM_ANDAMENTO: readonly ProspectStage[] = [
  'em_cadencia',
  ...ETAPAS_EM_CONVERSA,
];

export function isOpportunityInProgress(oportunidade: Pick<ProspectWithCompany, 'stage'>): boolean {
  return ETAPAS_EM_ANDAMENTO.includes(oportunidade.stage);
}

/**
 * Empresa → oportunidades dela em andamento. O card consulta aqui se OUTRA oportunidade da
 * mesma empresa está no funil (`otherOpportunitiesInProgress`).
 */
export function opportunitiesInProgressByCompany(
  prospects: ProspectWithCompany[],
): Map<string, ProspectWithCompany[]> {
  const mapa = new Map<string, ProspectWithCompany[]>();
  for (const p of prospects.filter(isOpportunityInProgress)) {
    mapa.set(p.company_id, [...(mapa.get(p.company_id) ?? []), p]);
  }
  return mapa;
}

/** As outras oportunidades em andamento da mesma empresa — a lista do balão e do aviso. */
export function otherOpportunitiesInProgress(
  oportunidade: Pick<ProspectWithCompany, 'id' | 'company_id'>,
  porEmpresa: Map<string, ProspectWithCompany[]>,
): ProspectWithCompany[] {
  return (porEmpresa.get(oportunidade.company_id) ?? []).filter((o) => o.id !== oportunidade.id);
}

type OportunidadeParaSituacao = Pick<ProspectWithCompany, 'stage' | 'discard_reason'>;

interface Contexto {
  temCliente: boolean;
  etapas: ProspectStage[];
  oportunidades: OportunidadeParaSituacao[];
}

/** Em ordem de prioridade: a primeira regra que se aplica decide a situação. */
const REGRAS: ReadonlyArray<[CompanyProspectStatus, (c: Contexto) => boolean]> = [
  ['cliente', (c) => c.temCliente || c.etapas.some((e) => ETAPAS_DE_CLIENTE.includes(e))],
  ['em_conversa', (c) => c.etapas.some((e) => ETAPAS_EM_CONVERSA.includes(e))],
  ['pediu_para_parar', (c) => c.oportunidades.some(pediuParaParar)],
  ['em_cadencia', (c) => c.etapas.includes('em_cadencia')],
  ['na_fila', (c) => c.etapas.includes('a_abordar')],
  ['sem_contato', (c) => c.oportunidades.length === 0],
];

export function companyProspectStatus(
  company: Pick<ProspectCompanyDB, 'client_id'>,
  oportunidades: OportunidadeParaSituacao[],
): CompanyProspectStatus {
  const contexto: Contexto = {
    temCliente: !!company.client_id,
    etapas: oportunidades.map((c) => c.stage),
    oportunidades,
  };
  return REGRAS.find(([, aplica]) => aplica(contexto))?.[0] ?? 'sem_retorno';
}

function pediuParaParar(oportunidade: OportunidadeParaSituacao): boolean {
  return oportunidade.stage === 'descartado' && oportunidade.discard_reason === 'pediu_para_parar';
}

/** Linha da tabela de empresas: a empresa, as oportunidades e os contatos dela. */
export interface CompanyRow {
  company: ProspectCompanyDB;
  /** Os cards do Pipeline da empresa — desde 09/10/2026, as oportunidades dela. */
  opportunities: ProspectWithCompany[];
  /** As pessoas cadastradas na empresa (`prospect_contacts`), em oportunidade ou não. */
  contacts: ProspectContactDB[];
  status: CompanyProspectStatus;
  /** Donos distintos das oportunidades, na ordem em que aparecem. */
  ownerIds: string[];
  /**
   * O prazo da tarefa pendente mais urgente entre as oportunidades (28/09/2026). Era a data da
   * cadência; passou a ser a tarefa, o único prazo que alguém do time assumiu.
   */
  nextTaskOn: string | null;
  /** Segmentação lida do texto livre da empresa — ver `companySegmentation`. */
  setor: string | null;
  subsetor: string | null;
  anel: number | null;
  tier: number | null;
}

export function buildCompanyRows(
  companies: ProspectCompanyDB[],
  prospects: ProspectWithCompany[],
  proximaTarefa: Map<string, PendingTaskLite> = new Map(),
  pessoas: ProspectContactDB[] = [],
): CompanyRow[] {
  const porEmpresa = agruparPorEmpresa(prospects);
  const pessoasPorEmpresa = agruparPorEmpresa(pessoas);

  return companies.map((company) => {
    const opportunities = porEmpresa.get(company.id) ?? [];
    const { setor, subsetor } = parseSegment(company.segment);
    return {
      company,
      setor,
      subsetor,
      anel: parseRank(company.ring),
      tier: parseRank(company.tier),
      opportunities,
      contacts: pessoasPorEmpresa.get(company.id) ?? [],
      status: companyProspectStatus(company, opportunities),
      ownerIds: distintos(opportunities.map((c) => c.owner_id)),
      nextTaskOn: menorData(opportunities.map((c) => proximaTarefa.get(c.id)?.due_date ?? null)),
    };
  });
}

function agruparPorEmpresa<T extends { company_id: string }>(itens: T[]): Map<string, T[]> {
  const mapa = new Map<string, T[]>();
  for (const item of itens) mapa.set(item.company_id, [...(mapa.get(item.company_id) ?? []), item]);
  return mapa;
}

function distintos(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => !!id))];
}

function menorData(datas: Array<string | null>): string | null {
  const validas = datas.filter((d): d is string => !!d).sort();
  return validas[0] ?? null;
}
