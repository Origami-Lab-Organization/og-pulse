import type { ProspectCompanyDB, ProspectStage, ProspectWithCompany } from '@/types/prospect';
import { parseRank, parseSegment } from './companySegmentation';

/**
 * Situação da EMPRESA na prospecção, derivada dos contatos dela (24/09/2026).
 *
 * Responde uma pergunta só: "posso abordar esta empresa agora?". A regra de CRM por trás é
 * não atravessar uma conversa que já existe, nem voltar a quem pediu para parar. Por isso a
 * situação é da empresa, não do contato: basta UM contato de "Respondeu" em diante para a
 * conta inteira ficar em "Não abordar".
 *
 * Cadência NÃO bloqueia (24/09/2026, Guilherme): é tentativa sem resposta, e abordar outro
 * contato da mesma empresa enquanto ela corre é legítimo.
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
    label: 'Cliente / oportunidade',
    hint: 'Já está com o comercial',
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
    hint: 'Contato cadastrado, ainda sem toque',
    action: 'abordar',
    dot: 'bg-muted-foreground/50',
  },
  sem_contato: {
    label: 'Sem contato',
    hint: 'Cadastre um contato para começar',
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

/** Conversa aberta ou já passada ao comercial: o contato que ocupa a empresa. */
export function isContactInConversation(contato: Pick<ProspectWithCompany, 'stage'>): boolean {
  return ETAPAS_EM_CONVERSA.includes(contato.stage) || contato.stage === 'convertido';
}

/**
 * Para o Kanban da Prospecção: empresa → contatos dela que estão em conversa ou além.
 * O card de cada contato consulta aqui se OUTRO contato da mesma empresa já conversa.
 */
export function contactsInConversationByCompany(
  prospects: ProspectWithCompany[],
): Map<string, ProspectWithCompany[]> {
  const mapa = new Map<string, ProspectWithCompany[]>();
  for (const p of prospects.filter(isContactInConversation)) {
    mapa.set(p.company_id, [...(mapa.get(p.company_id) ?? []), p]);
  }
  return mapa;
}

type ContatoParaSituacao = Pick<ProspectWithCompany, 'stage' | 'discard_reason'>;

interface Contexto {
  temCliente: boolean;
  etapas: ProspectStage[];
  contatos: ContatoParaSituacao[];
}

/** Em ordem de prioridade: a primeira regra que se aplica decide a situação. */
const REGRAS: ReadonlyArray<[CompanyProspectStatus, (c: Contexto) => boolean]> = [
  ['cliente', (c) => c.temCliente || c.etapas.includes('convertido')],
  ['em_conversa', (c) => c.etapas.some((e) => ETAPAS_EM_CONVERSA.includes(e))],
  ['pediu_para_parar', (c) => c.contatos.some(pediuParaParar)],
  ['em_cadencia', (c) => c.etapas.includes('em_cadencia')],
  ['na_fila', (c) => c.etapas.includes('a_abordar')],
  ['sem_contato', (c) => c.contatos.length === 0],
];

export function companyProspectStatus(
  company: Pick<ProspectCompanyDB, 'client_id'>,
  contatos: ContatoParaSituacao[],
): CompanyProspectStatus {
  const contexto: Contexto = {
    temCliente: !!company.client_id,
    etapas: contatos.map((c) => c.stage),
    contatos,
  };
  return REGRAS.find(([, aplica]) => aplica(contexto))?.[0] ?? 'sem_retorno';
}

function pediuParaParar(contato: ContatoParaSituacao): boolean {
  return contato.stage === 'descartado' && contato.discard_reason === 'pediu_para_parar';
}

/** Linha da tabela de empresas: a empresa, os contatos dela e o que se deriva deles. */
export interface CompanyRow {
  company: ProspectCompanyDB;
  contacts: ProspectWithCompany[];
  status: CompanyProspectStatus;
  /** Donos distintos dos contatos, na ordem em que aparecem. */
  ownerIds: string[];
  /** A próxima atividade mais próxima entre os contatos, se houver. */
  nextActivityOn: string | null;
  /** Segmentação lida do texto livre da empresa — ver `companySegmentation`. */
  setor: string | null;
  subsetor: string | null;
  anel: number | null;
  tier: number | null;
}

export function buildCompanyRows(
  companies: ProspectCompanyDB[],
  prospects: ProspectWithCompany[],
): CompanyRow[] {
  const porEmpresa = new Map<string, ProspectWithCompany[]>();
  for (const p of prospects) {
    const lista = porEmpresa.get(p.company_id) ?? [];
    lista.push(p);
    porEmpresa.set(p.company_id, lista);
  }

  return companies.map((company) => {
    const contacts = porEmpresa.get(company.id) ?? [];
    const { setor, subsetor } = parseSegment(company.segment);
    return {
      company,
      setor,
      subsetor,
      anel: parseRank(company.ring),
      tier: parseRank(company.tier),
      contacts,
      status: companyProspectStatus(company, contacts),
      ownerIds: distintos(contacts.map((c) => c.owner_id)),
      nextActivityOn: menorData(contacts.map((c) => c.next_activity_on)),
    };
  });
}

function distintos(ids: Array<string | null>): string[] {
  return [...new Set(ids.filter((id): id is string => !!id))];
}

function menorData(datas: Array<string | null>): string | null {
  const validas = datas.filter((d): d is string => !!d).sort();
  return validas[0] ?? null;
}
