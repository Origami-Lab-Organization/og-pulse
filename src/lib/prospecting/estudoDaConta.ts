import {
  PROSPECT_CONTACT_ROLES,
  type ProspectCompanyDB,
  type ProspectContactRole,
  type ProspectOpportunityContact,
  type ProspectWithCompany,
} from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';
import type { GrupoDePessoas, ItemDoEstudo } from '@/types/estudoDaConta';

/**
 * Regras do estudo da conta (US-0020): as pessoas pelo papel na decisão que a oportunidade já
 * tem (ADR-0045), o que falta, e os sócios da Receita ainda não trazidos (ADR-0041). O estudo
 * só orienta: nada aqui impede a oportunidade de avançar.
 */

const DECISOR: ProspectContactRole = 'decisor';
const SOCIO_EMPRESA: ProspectCompanyPartnerDB['tipo'] = 'empresa';

/** Quem decide primeiro, quem bloqueia por último; sem papel no fim, para chamar atenção. */
const ORDEM: ReadonlyArray<ProspectContactRole> = ['decisor', 'influenciador', 'campeao', 'usuario', 'bloqueador'];

export function pessoasPorPapel(contatos: ProspectOpportunityContact[]): GrupoDePessoas[] {
  const grupos: GrupoDePessoas[] = ORDEM.map((papel) => ({
    papel,
    rotulo: PROSPECT_CONTACT_ROLES.find((r) => r.value === papel)?.label ?? papel,
    pessoas: contatos.filter((c) => c.role === papel),
  }));
  grupos.push({ papel: null, rotulo: 'Sem papel', pessoas: contatos.filter((c) => !c.role) });
  return grupos.filter((g) => g.pessoas.length > 0);
}

/** O que ainda falta saber de uma pessoa para abordá-la. */
export function faltasDaPessoa(contato: ProspectOpportunityContact['contact']): string[] {
  if (!contato) return [];
  return [!contato.role && 'cargo', !contato.linkedin_url && 'LinkedIn', !contato.instagram_url && 'Instagram'].filter(
    (f): f is string => !!f,
  );
}

export function oQueFalta(prospect: ProspectWithCompany, empresa: ProspectCompanyDB | null | undefined): ItemDoEstudo[] {
  const contatos = prospect.contacts ?? [];
  return [
    { chave: 'decisor', rotulo: 'Alguém como Decisor', feito: contatos.some((c) => c.role === DECISOR) },
    { chave: 'alavanca', rotulo: 'Alavanca (canal de chegada)', feito: !!prospect.lever },
    { chave: 'funcionarios', rotulo: 'Funcionários confirmados', feito: empresa?.funcionarios_informados != null },
  ];
}

/** Sócios pessoa física, no quadro atual, que ainda não viraram contato. */
export function sociosParaTrazer(socios: ProspectCompanyPartnerDB[]): ProspectCompanyPartnerDB[] {
  return socios.filter((s) => s.ativo && s.tipo !== SOCIO_EMPRESA && !s.contact_id && !s.prospect_id);
}
